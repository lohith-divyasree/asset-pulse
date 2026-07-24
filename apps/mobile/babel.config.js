module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          'react-compiler': {
            target: '18', // 👈 Targets React 18 runtime
          },
        },
      ],
    ],
  };
};