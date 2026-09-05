const axios = require('axios');
const https = require('https');

const TIMEOUT = 25000;
const HARGA_API_KEY = "TGZONE-ID-ee53f4b5-0303-4b3b-aab8-90cefd75d163";

const CONFIG = {
  BASE_URL: "https://ap-mc.klikindomaret.com/assets-klikidmcore/api/get/catalog-xpress/api/webapp/search/result",
  STORE_CODE: "TSBA",
  LATITUDE: "-7.288728",
  LONGITUDE: "112.71329",
  MODE: "DELIVERY",
  DISTRICT_ID: "141500075",
};

const client = axios.create({
  timeout: TIMEOUT,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Origin': 'https://www.klikindomaret.com',
    'Referer': 'https://www.klikindomaret.com/',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

async function searchProducts(keyword) {
  const allProducts = [];
  let page = 0;
  let hasMore = true;

  while (hasMore && allProducts.length < 50) {
    // PENTING: harus pakai backtick `
    const url = CONFIG.BASE_URL + 
      "?keyword=" + encodeURIComponent(keyword) +
      "&type=keyword&page=" + page +
      "&size=50&storeCode=" + CONFIG.STORE_CODE +
      "&latitude=" + CONFIG.LATITUDE +
      "&longitude=" + CONFIG.LONGITUDE +
      "&mode=" + CONFIG.MODE +
      "&districtId=" + CONFIG.DISTRICT_ID +
      "&isUserFiltered=false";

    try {
      const response = await client.get(url);

      if (!response.data || response.data.status !== "00") break;

      const content = response.data?.data?.content || [];

      if (content.length === 0) {
        hasMore = false;
      } else {
        allProducts.push(...content);
        const totalPages = response.data?.data?.totalPages || 0;
        if (page >= totalPages - 1) {
          hasMore = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      throw new Error("Gagal mengambil data: " + error.message);
    }
  }

  return allProducts;
}

function formatProduct(product) {
  return {
    plu: String(product.plu || "-"),
    productName: product.productName || "Tanpa Nama",
    price: Number(product.price || 0),
    finalPrice: Number(product.finalPrice || 0),
    discountText: product.discountText || "",
    promoText: product.promoText  product.promo  "",
    imageUrl: product.imageUrl  product.image  "",
    brandName: product.brandName || "-",
    size: product.size  product.uom  "-",
    descriptionList: product.descriptionList || []
  };
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      sukses: false,
      produk: [],
      kesalahan: "Method Not Allowed"
    });
  }

  const apiKey =
    req.headers["x-api-key"] ||
    req.headers["x-correlation-id"] ||
    req.query.api_key ||
    req.query.x_correlation_id;

  if (!apiKey || apiKey !== HARGA_API_KEY) {
    return res.status(401).json({
      sukses: false,
      produk: [],
      kesalahan: "x-API_KEY tidak valid.. hubungi developer TGZONE-ID"
    });
  }

  const keyword = req.query.keyword || req.query.q;

  if (!keyword) {
    return res.status(400).json({
      sukses: false,
      produk: [],
      kesalahan: "Parameter 'keyword' atau 'q' wajib diisi"
    });
  }

  try {
    const allProducts = await searchProducts(keyword);
    let products = allProducts.map(formatProduct);

    if (/^\d+$/.test(keyword)) {
      products = products.filter(p => p.plu === keyword);
    }

    return res.json({
      sukses: true,
      produk: products
    });

  } catch (err) {
    console.error("ERROR:", err.message);
    return res.status(500).json({
      sukses: false,
      produk: [],
      kesalahan: err.message
    });
  }
};
