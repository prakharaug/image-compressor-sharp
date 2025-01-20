const { Dropbox } = require('dropbox');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { log } = require('console');
require('dotenv').config();

// Configure your Dropbox access token
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const dbx = new Dropbox({ accessToken: ACCESS_TOKEN });

// Function to upload a file to Dropbox
async function uploadFile(filePath) {
    const fileName = path.basename(filePath);
    const dropboxPath = `/2025 01 20/${fileName}`;

    try {
        const fileContent = fs.readFileSync(filePath);
        const response = await dbx.filesUpload({
            path: dropboxPath,
            contents: fileContent,
            mode: 'overwrite',
        });

        return response.result.path_lower;
    } catch (error) {
        console.error(`Failed to upload ${fileName}:`, error);
        return null;
    }
}

// Function to get or create a shared link
async function getSharedLink(dropboxPath) {
    try {
        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({
            path: dropboxPath,
        });

        return sharedLink.result.url.replace('dl=0', 'dl=1');
    } catch (error) {
        if (error.status === 409 && error.error && error.error.error.shared_link_already_exists) {
            const existingLink = error.error.error.shared_link_already_exists.metadata.url;
            return existingLink.replace('dl=0', 'dl=1');
        } else {
            console.error(`Failed to create/get shared link for ${dropboxPath}:`, error);
            return null;
        }
    }
}

// Function to save links to an Excel file
async function saveLinksToExcel(links, outputFilePath) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Links');

    worksheet.columns = [
        { header: 'FileName', key: 'FileName', width: 30 },
        { header: 'Link', key: 'Link', width: 60 },
    ];

    links.forEach(link => {
        worksheet.addRow(link);
    });

    await workbook.xlsx.writeFile(outputFilePath);
    console.log(`Links saved to ${outputFilePath}`);
}

// Main function to upload images and generate links
async function uploadImagesAndGenerateLinks(folderPath) {
    const files = fs.readdirSync(folderPath);
    const imageLinks = [];

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const dropboxPath = await uploadFile(filePath);

        if (dropboxPath) {
            const link = await getSharedLink(dropboxPath);
            if (link) {
                imageLinks.push({ FileName: file, Link: link });
                console.log("Processed " + file);
            }
        }
    }

    // Write links to an Excel file
    const outputFilePath = path.join(folderPath, 'image_links.xlsx');
    await saveLinksToExcel(imageLinks, outputFilePath);

    console.log('Image links generated and saved to:', outputFilePath);
}

// Define the folder containing images
const imagesFolder = '_Original_Images';

// Execute the main function
uploadImagesAndGenerateLinks(imagesFolder);
