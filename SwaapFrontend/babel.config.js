module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@utils': './src/utils',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@redux': './src/redux',
            '@constants': './src/constants',
            '@config': './src/config',
            '@types': './src/types',
            '@navigation': './src/navigation'
          }
        }
      ],
      'react-native-worklets/plugin'  // ✅ Keep only this one - REMOVE the reanimated/plugin
    ]
  };
};