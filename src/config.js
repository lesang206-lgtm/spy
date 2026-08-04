require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  isRender: !!process.env.RENDER,
  thuocsi: {
    baseUrl: 'https://thuocsi.vn',
    email: process.env.THUOCSI_EMAIL || '',
    password: process.env.THUOCSI_PASSWORD || '',
  },
  longchau: {
    baseUrl: 'https://nhathuoclongchau.com.vn',
  },
  pharmart: {
    baseUrl: 'https://www.pharmart.vn',
  },
  medigo: {
    baseUrl: 'https://www.medigoapp.com',
  },
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  },
};
