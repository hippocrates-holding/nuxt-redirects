import {
  defineNuxtModule,
  createResolver,
  addTemplate,
  addRouteMiddleware,
} from "@nuxt/kit";
import { consola } from "consola";
import { zcsv, parseCSVContent } from "zod-csv";
import { z } from "zod";
import { readFile } from "fs/promises";

// Module options TypeScript interface definition
export interface ModuleOptions {
  csv: string;
  trailingSlash: boolean;
  alwaysRedirect: boolean;
  redirectExclusions: string[];
  parentRegexSplitSequence: string;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-redirects",
    configKey: "redirects",
  },
  // Default configuration options of the Nuxt module
  defaults: {
    csv: "redirects.csv",
    trailingSlash: false,
    alwaysRedirect: false,
    redirectExclusions: ["^\\/api\\/.*$"],
    parentRegexSplitSequence: "$/$"
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    const redirectsPath = await resolver.resolvePath(options.csv, {
      cwd: nuxt.options.srcDir,
    });

    // schema
    const redirectsSchema = z.object({
      code: zcsv.number(),
      from: zcsv.string(),
      to: zcsv.string(),
      parents: zcsv.string(z.string().optional().default("")),
      comments: zcsv.string(z.string().optional().default(""))
    });
    // reading csv
    const csv = await readFile(redirectsPath, { encoding: "utf8" }).catch(
      () => {
        throw new Error("Error reading redirects csv file");
      },
    );
    const parsedCsv = parseCSVContent(csv, redirectsSchema);

    type TypedRedirects = {
      punctualRedirects: PunctualRedirects,
      regexRedirects: RegexRedirects,
      punctualDoNotRedirect: PunctualDoNotRedirects,
      regexDoNotRedirect: string[]
    }
    type PunctualDoNotRedirects = {
      [key: string]: boolean;
    };
    type RegexRedirectContainer = {
      regex: string,
      children: RegexRedirects,
      redirects: RegexRedirect[]
     }
    type RegexRedirect = {
        code: number,
        from: string,
        to: string
    };
    type RegexRedirects = {
      [key: string]: RegexRedirectContainer
    };
    type PunctualRedirect = {
      query: string[],
      code: number,
      to: string
    }
    type PunctualRedirects = {
      [key: string]: PunctualRedirect[]
    };    
    
    const redirects : TypedRedirects = {
      punctualRedirects: {},
      regexRedirects: {"root": {
        regex: "^.*$",
        children: {},
        redirects: []
      }},
      punctualDoNotRedirect: {},
      regexDoNotRedirect: []
    }
    for(const redirectExclusion of options.redirectExclusions){
      const isRegex = redirectExclusion.startsWith("^") && redirectExclusion.endsWith("$");
      if(isRegex){
        redirects.regexDoNotRedirect.push(redirectExclusion);
      }else{
        redirects.punctualDoNotRedirect[redirectExclusion] = true
      }
    }

    const getUrl = (path: string) => {
      return path.split("?")[0]
    }
  
    const getQuery = (path: string) => {
      return path.split("?")?.[1] ?? ''
    }

    const hasTrailingSlash = (path: string) => path.endsWith("/")
    const removeTrailingSlash = (path: string) => hasTrailingSlash(path) ? path.slice(0, -1) : path
  
    for(const redirectRow of parsedCsv.validRows){
      const isRegex = redirectRow.from.startsWith("^") && redirectRow.from.endsWith("$");
      let currentNode : RegexRedirectContainer | PunctualRedirects | undefined;
      if(isRegex && redirectRow.parents){
        const parents = redirectRow.parents.split(options.parentRegexSplitSequence)
        for(const parent of parents.filter(parent => parent.startsWith("^") && parent.endsWith("$"))){
          if(!currentNode){
            if(!redirects.regexRedirects[parent]){
              redirects.regexRedirects[parent] = {
                regex: parent,
                redirects: [],
                children: {}
              }
            }
            currentNode = redirects.regexRedirects[parent];
          }else if(!Object.hasOwn(currentNode.children, parent)){
            (currentNode.children as RegexRedirects)[parent] = {
              regex: parent,
              redirects: [],
              children: {}
            }
            currentNode = (currentNode.children as RegexRedirects)[parent] ;
          }else{
            currentNode =  (currentNode.children as RegexRedirects)[parent]
          }
        }
      }else if(isRegex){
        currentNode = redirects.regexRedirects["root"];
      }else{
        currentNode = redirects.punctualRedirects;
      }
      if(isRegex){
        (currentNode as RegexRedirectContainer).redirects.push({
          code: redirectRow.code,
          from: redirectRow.from,
          to: redirectRow.to
        })
      }else{
        const path = removeTrailingSlash(getUrl(redirectRow.from))
        const query = getQuery(redirectRow.from)
        const queryArray = query ? query.split("&") : [];
        (currentNode as PunctualRedirects)[path] = [
          ...(currentNode as PunctualRedirects)[path] ?? [],
          {
            query: queryArray,
            code: redirectRow.code,
            to: redirectRow.to
          }
        ]
      }
    }

    // get valid rows and write them as a template inside nuxt dir
    // you can access it later importing redirects from '#build/nuxt-redirects/redirects'
    addTemplate({
      filename: "nuxt-redirects/redirects.ts",
      write: true,
      getContents: () => {
        return `
export const redirects = ${JSON.stringify(redirects)} as const
`;
      },
    });

    const { dst } = addTemplate({
      filename: "nuxt-redirects/redirectsMiddleware.ts",
      write: true,
      options,
      src: await resolver.resolvePath("./runtime/redirectsMiddleware.global"),
    });

    addRouteMiddleware({
      name: "redirectsMiddleware",
      path: dst!,
      global: true,
    });

    // @ts-ignore
    consola.info(`Added ${parsedCsv.validRows.length} redirection rules`);
  },
});
