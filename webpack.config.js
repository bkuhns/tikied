import path from 'path';
import { fileURLToPath } from 'url';
import { EsbuildPlugin } from 'esbuild-loader';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      main_page: './src/pages/main_page.tsx'
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
      ...(isProduction && {
        runtimeChunk: 'single',
        splitChunks: {
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      }),
    },
    performance: isProduction ? {
      maxEntrypointSize: 2500000,
      maxAssetSize: 2500000,
    } : false,
    plugins: [
      new HtmlWebpackPlugin({
        template: 'public/index.html',
        scriptLoading: 'module'
      }),
      new CopyPlugin({
        patterns: [
          { 
            from: 'public', 
            to: '.',
            globOptions: {
              ignore: ['**/index.html']
            }
          },
        ],
      }),
    ],
  };
};
