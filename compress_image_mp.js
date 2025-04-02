const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const heicConvert = require('heic-convert');

const inputDir = '_Original_Images';
const outputDir = '_Compressed_Images';
const MAX_MEGAPIXELS = 20;

const OUTPUT_FORMAT = 'webp';
const QUALITY = 85;
const SAVE_EXCEL = true;

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const imageData = [];

async function compressImage(inputPath, outputPath) {
    try {
        let imageBuffer;

        if (path.extname(inputPath).toLowerCase() === '.heic') {
            const inputBuffer = fs.readFileSync(inputPath);
            const outputBuffer = await heicConvert({
                buffer: inputBuffer,
                format: 'PNG',
                quality: 1
            });
            imageBuffer = outputBuffer;
        } else {
            imageBuffer = fs.readFileSync(inputPath);
        }

        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        let { width, height } = metadata;
        const megapixels = (width * height) / 1000000;

        if (megapixels > MAX_MEGAPIXELS) {
            const scaleFactor = Math.sqrt(MAX_MEGAPIXELS / megapixels);
            width = Math.floor(width * scaleFactor);
            height = Math.floor(height * scaleFactor);
        }

        await image
            .resize(width, height)
            .keepMetadata()
        [OUTPUT_FORMAT]({ quality: QUALITY })
            .toFile(outputPath);
    } catch (error) {
        console.error(`Error compressing image ${inputPath}:`, error);
    }
}

const processImages = async (inputDir, outputDir) => {
    const items = fs.readdirSync(inputDir);

    for (const item of items) {
        const inputPath = path.join(inputDir, item);
        const outputPath = path.join(outputDir, item);

        if (fs.statSync(inputPath).isDirectory()) {
            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath);
            }
            await processImages(inputPath, outputPath);
        } else {
            const extnameOriginal = path.extname(item);
            const extnameLower = extnameOriginal.toLowerCase();
            if (!['.jpg', '.jpeg', '.png', '.webp', '.heic'].includes(extnameLower)) {
                console.log(`Skipping non-image file ${item}`);
                continue;
            }

            const baseName = path.basename(item, extnameOriginal);
            const outputFileName = baseName + `.${OUTPUT_FORMAT}`;
            const compressedOutputPath = path.join(outputDir, outputFileName);

            if (fs.existsSync(compressedOutputPath)) {
                console.log(`Skipping ${inputPath} as it is already compressed.`);
                continue;
            }

            const originalStats = fs.statSync(inputPath);

            await compressImage(inputPath, compressedOutputPath);
            console.log(`Compressed ${inputPath} and saved as ${compressedOutputPath}`);

            const compressedStats = fs.statSync(compressedOutputPath);

            imageData.push({
                fileName: outputFileName,
                originalSize: originalStats.size,
                compressedSize: compressedStats.size
            });
        }
    }
};

const saveToExcel = async (data, outputPath) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Image Sizes');

    worksheet.columns = [
        { header: 'File Name', key: 'fileName' },
        { header: 'Original Size (Bytes)', key: 'originalSize' },
        { header: 'Compressed Size (Bytes)', key: 'compressedSize' },
    ];

    worksheet.addRows(data);

    await workbook.xlsx.writeFile(outputPath);
    console.log(`Image sizes saved to ${outputPath}`);
};

const main = async () => {
    await processImages(inputDir, outputDir);
    if (SAVE_EXCEL) {
        await saveToExcel(imageData, 'Image_Sizes.xlsx');
    } else {
        console.log('Skipping Excel file generation as per configuration.');
    }
};

main().catch(console.error);