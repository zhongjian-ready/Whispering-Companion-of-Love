const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  const { value, type } = event;

  try {
    let result;
    if (type === 'img') {
      // value is fileID
      const res = await cloud.downloadFile({
        fileID: value,
      });
      const buffer = res.fileContent;

      result = await cloud.openapi.security.imgSecCheck({
        media: {
          contentType: 'image/png',
          value: buffer,
        },
      });
    } else if (type === 'text') {
      // value is text content
      result = await cloud.openapi.security.msgSecCheck({
        content: value,
      });
    }

    return result;
  } catch (err) {
    return err;
  }
};
