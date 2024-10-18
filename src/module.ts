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

    type PunctualDoNotRedirects = {
      [key: string]: boolean;
    };
    type RegexRedirect = {
        "code": number,
        "from": string,
        "to": string
    };
    type RegexRedirects = {
      [key: string]: RegexRedirects | RegexRedirect[]
    };
    type PunctualRedirect = {
      "query": string[],
      "code": number,
      "to": string
    }
    type PunctualRedirects = {
      [key: string]: PunctualRedirect[]
    };

    const redirects : {
      punctualRedirects: PunctualRedirects,
      regexRedirects: RegexRedirects,
      punctualDoNotRedirect: PunctualDoNotRedirects,
      regexDoNotRedirect: string[]
    } = {
      punctualRedirects: {},
      regexRedirects: {},
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

    for(const redirectRow of parsedCsv.validRows){
      const isRegex = redirectRow.from.startsWith("^") && redirectRow.from.endsWith("$");
      let currentNode = isRegex ? redirects.regexRedirects : redirects.punctualRedirects;
      if(isRegex && redirectRow.parents){
        const parents = redirectRow.parents.split(options.parentRegexSplitSequence)
        for(const parent of parents.filter(parent => parent.startsWith("^") && parent.endsWith("$"))){
          if(!Object.hasOwn(currentNode, parent)){
            currentNode[parent] = {}
          }
          currentNode = currentNode[parent] as RegexRedirects;
        }
      }
      if(isRegex){
        if(!Object.hasOwn(currentNode, "root")){
          currentNode['root'] = [] as RegexRedirect[];
        }
        (currentNode['root'] as RegexRedirect[]).push({
          code: redirectRow.code,
          from: redirectRow.from,
          to: redirectRow.to
        })
      }else{
        const path = getUrl(redirectRow.from)
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
