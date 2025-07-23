interface DocsConfig {
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
  filesToCopy: Array<{
    source: string;
    destination: string;
  }>;
  plugins?: any[];
  version: {
    source: string;
  };
  customContent?: {
    [key: string]: (content: string) => string;
  };
}

const config: DocsConfig = {
  projectName: 'Fjell Lib Firestore',
  basePath: '/lib-firestore/',
  port: 3006,
  branding: {
    theme: 'firestore',
    tagline: 'Firestore integration for the Fjell ecosystem',
    backgroundImage: '/pano.png',
    github: 'https://github.com/getfjell/lib-firestore',
    npm: 'https://www.npmjs.com/package/@fjell/lib-firestore'
  },
  sections: [
    {
      id: 'overview',
      title: 'Foundation',
      subtitle: 'Firestore integration & architecture',
      file: '/lib-firestore/README.md'
    },
    {
      id: 'examples',
      title: 'Examples',
      subtitle: 'Code examples & usage patterns',
      file: '/lib-firestore/examples-README.md'
    }
  ],
  filesToCopy: [
    {
      source: '../README.md',
      destination: 'public/README.md'
    },
    {
      source: '../examples/README.md',
      destination: 'public/examples-README.md'
    }
  ],
  plugins: [],
  version: {
    source: 'package.json'
  }
}

export default config
