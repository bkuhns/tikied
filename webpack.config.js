import path from 'path';
import { fileURLToPath } from 'url';
import { EsbuildPlugin } from 'esbuild-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/main_app.tsx',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'eval-source-map',
    target: 'es2022',
    experiments: {
      outputModule: true,
    },
    externalsType: 'module',
    externals: {
      'react': 'react',
      'react-dom': 'react-dom',
      'react-dom/client': 'react-dom/client',
      'react/jsx-runtime': 'react/jsx-runtime',
      '@fluentui/react-components': '@fluentui/react-components',
      '@fluentui/react-icons': '@fluentui/react-icons',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main_app.js',
      module: true,
      clean: false,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      extensionAlias: {
        '.js': ['.ts', '.tsx', '.js'],
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'esbuild-loader',
          options: {
            loader: 'tsx',
            target: 'es2022',
          },
        },
      ],
    },
    optimization: {
      minimizer: isProduction
        ? [
            new EsbuildPlugin({
              target: 'es2022',
            }),
          ]
        : [],
    },
  };
};
