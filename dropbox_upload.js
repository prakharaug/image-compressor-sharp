const { Dropbox } = require('dropbox');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const fetch = require('node-fetch'); // Required for Dropbox SDK
require('dotenv').config();

// Configure Dropbox
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const dbx = new Dropbox({ accessToken: ACCESS_TOKEN, fetch });

// Base Dropbox folder
const DROPBOX_BASE_FOLDER = '/2025 02 14';

// Define the root folder containing images
const imagesFolder = '_Compressed_Images';

// Function to upload a file to Dropbox
async function uploadFile(localPath, dropboxPath) {
    try {
        const fileContent = fs.readFileSync(localPath);
        const response = await dbx.filesUpload({
            path: dropboxPath,
            contents: fileContent,
            mode: { ".tag": "overwrite" },
        });

        return response.result.path_lower;
    } catch (error) {
        console.error(`Failed to upload ${localPath}:`, error.message);
        return null;
    }
}

// Function to get an existing shared link or create a new one
async function getSharedLink(dropboxPath) {
    try {
        const linksResponse = await dbx.sharingListSharedLinks({ path: dropboxPath });
        if (linksResponse.result.links.length > 0) {
            return linksResponse.result.links[0].url.replace('dl=0', 'dl=1');
        }

        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({ path: dropboxPath });
        return sharedLink.result.url.replace('dl=0', 'dl=1');

    } catch (error) {
        console.error(`Failed to create/get shared link for ${dropboxPath}:`, error.message);
        return null;
    }
}

// Function to ensure a folder exists on Dropbox
async function ensureDropboxFolder(dropboxPath) {
    try {
        await dbx.filesCreateFolderV2({ path: dropboxPath });
    } catch (error) {
        if (error.status !== 409) { // 409 means the folder already exists
            console.error(`Failed to create folder ${dropboxPath}:`, error.message);
        }
    }
}

// Function to save links to an Excel file
async function saveLinksToExcel(links, outputFilePath) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Links');

    worksheet.columns = [
        { header: 'File Name', key: 'FileName', width: 40 },
        { header: 'Dropbox Link', key: 'Link', width: 80 },
    ];

    links.forEach(link => worksheet.addRow(link));

    await workbook.xlsx.writeFile(outputFilePath);
    console.log(`Links saved to ${outputFilePath}`);
}

// Function to recursively upload images and generate links
async function processFolder(localFolder, dropboxFolder, imageLinks) {
    await ensureDropboxFolder(dropboxFolder);

    const items = fs.readdirSync(localFolder);

    for (const item of items) {
        const localPath = path.join(localFolder, item);
        const dropboxPath = `${dropboxFolder}/${item}`;

        if (fs.lstatSync(localPath).isDirectory()) {
            await processFolder(localPath, dropboxPath, imageLinks);
        } else {
            console.log(`Uploading: ${localPath}`);
            const uploadedPath = await uploadFile(localPath, dropboxPath);
            if (uploadedPath) {
                const link = await getSharedLink(uploadedPath);
                if (link) {
                    imageLinks.push({ FileName: dropboxPath, Link: link });
                    console.log(`Uploaded: ${localPath} -> ${dropboxPath}`);
                }
            }
        }
    }
}

// Function to start the upload process
async function uploadImagesAndGenerateLinks(baseFolder) {
    if (!fs.existsSync(baseFolder)) {
        console.error(`Folder not found: ${baseFolder}`);
        return;
    }

    const imageLinks = [];
    await processFolder(baseFolder, DROPBOX_BASE_FOLDER, imageLinks);

    if (imageLinks.length > 0) {
        const outputFilePath = path.join(baseFolder, 'image_links.xlsx');
        await saveLinksToExcel(imageLinks, outputFilePath);
        console.log('All image links generated and saved successfully.');
    } else {
        console.log('No images were uploaded.');
    }
}

// Execute the upload function
uploadImagesAndGenerateLinks(imagesFolder);
