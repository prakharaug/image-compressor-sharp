const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const inputDir = '_Original_Images';
const outputDir = '_Compressed_Images';
const MAX_MEGAPIXELS = 20;

// Define output format and quality here
const OUTPUT_FORMAT = 'webp'; // Change to 'jpg' or 'webp' as needed
const QUALITY = 85; // Change quality as needed
const SAVE_EXCEL = true; // Set to true to save Excel file, false otherwise

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Array to store image information
const imageData = [];

// Function to compress and convert images
async function compressImage(inputPath, outputPath) {
    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Calculate max width and height to keep image under 20MP
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
        [OUTPUT_FORMAT]({ quality: QUALITY }) // Use hardcoded format and quality
            .toFile(outputPath);
    } catch (error) {
        console.error(`Error compressing image ${inputPath}:`, error);
    }
}

// Function to process images in directories recursively
const processImages = async (inputDir, outputDir) => {
    // Read all items in the current directory
    const items = fs.readdirSync(inputDir);

    for (const item of items) {
        const inputPath = path.join(inputDir, item);
        const outputPath = path.join(outputDir, item);

        if (fs.statSync(inputPath).isDirectory()) {
            // If item is a directory, create corresponding directory in outputDir
            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath);
            }
            // Recursively process subdirectories
            await processImages(inputPath, outputPath);
        } else {
            const extname = path.extname(item).toLowerCase();
            if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extname)) {
                console.log(`Skipping non-image file ${item}`);
                continue;
            }

            const outputFileName = path.basename(item, extname) + `.${OUTPUT_FORMAT}`; // Dynamic extension
            const compressedOutputPath = path.join(outputDir, outputFileName);

            // Check if the image is already compressed
            if (fs.existsSync(compressedOutputPath)) {
                console.log(`Skipping ${inputPath} as it is already compressed.`);
                continue;
            }

            // Get size of the original image
            const originalStats = fs.statSync(inputPath);

            // Compress and convert image
            await compressImage(inputPath, compressedOutputPath);
            console.log(`Compressed ${inputPath} and saved as ${compressedOutputPath}`);

            // Get size of the compressed image
            const compressedStats = fs.statSync(compressedOutputPath);

            // Store image data
            imageData.push({
                fileName: outputFileName,
                originalSize: originalStats.size,
                compressedSize: compressedStats.size
            });
        }
    }
};

// Function to save image data to Excel
const saveToExcel = async (data, outputPath) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Image Sizes');

    // Add column headers
    worksheet.columns = [
        { header: 'File Name', key: 'fileName' },
        { header: 'Original Size (Bytes)', key: 'originalSize' },
        { header: 'Compressed Size (Bytes)', key: 'compressedSize' },
    ];

    // Add rows
    worksheet.addRows(data);

    // Write to file
    await workbook.xlsx.writeFile(outputPath);
    console.log(`Image sizes saved to ${outputPath}`);
};

// Main function to process images and optionally save to Excel
const main = async () => {
    await processImages(inputDir, outputDir);
    if (SAVE_EXCEL) {
        await saveToExcel(imageData, 'Image_Sizes.xlsx');
    } else {
        console.log('Skipping Excel file generation as per configuration.');
    }
};

main().catch(console.error);