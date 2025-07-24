import { DocsConfig } from '@fjell/docs-template';

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
