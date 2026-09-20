import path from 'path';
import { fileURLToPath } from 'url';
import { EsbuildPlugin } from 'esbuild-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      main_app: './src/main_app.tsx'
    },
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'eval-source-map',
    target: 'web',
    experiments: {
      outputModule: true,
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      chunkFilename: '[name].js',
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
