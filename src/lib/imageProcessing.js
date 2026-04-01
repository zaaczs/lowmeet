import heic2any from "heic2any";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Erro ao ler imagem"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Formato de imagem não suportado"));
    image.src = dataUrl;
  });
}

async function convertHeicIfNeeded(file) {
  const isHeic = /image\/heic|image\/heif/i.test(file.type) || /\.heic$/i.test(file.name);
  if (!isHeic) return file;

  const convertedBlob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
  return new File([blob], file.name.replace(/\.heic$/i, ".jpg"), {
    type: "image/jpeg",
  });
}

export async function processImageUpload(file, options = {}) {
  if (!file) {
    throw new Error("Arquivo não informado");
  }

  const {
    maxWidth = 1280,
    quality = 0.9,
    outputType = "image/jpeg",
  } = options;

  const normalizedFile = await convertHeicIfNeeded(file);
  const sourceDataUrl = await fileToDataUrl(normalizedFile);
  const image = await loadImage(sourceDataUrl);

  const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  const processedDataUrl = canvas.toDataURL(outputType, quality);

  return {
    dataUrl: processedDataUrl,
    width,
    height,
  };
}
