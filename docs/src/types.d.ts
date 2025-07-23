// Types are provided by the @fjell/docs-template package

declare module '@fjell/docs-template' {
  export interface DocsConfig {
    projectName: string;
    basePath: string;
    port: number;
    branding: {
      theme: string;
      tagline: string;
      logo?: string;
      backgroundImage?: string;
      primaryColor?: string;
      accentColor?: string;
      github?: string;
      npm?: string;
    };
    sections: Array<{
      id: string;
      title: string;
      subtitle: string;
      file: string;
    }>;
    plugins?: any[];
    version: {
      source: string;
    };
    customContent?: {
      [key: string]: (content: string) => string;
    };
  }

  export interface DocsAppProps {
    config: DocsConfig;
  }

  export const DocsApp: React.ComponentType<DocsAppProps>;
}

declare module '../docs.config.ts' {
  import type { DocsConfig } from '@fjell/docs-template'
  const config: DocsConfig
  export default config
}
