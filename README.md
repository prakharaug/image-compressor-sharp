# Image Compression and Dropbox Upload Tools

A set of Node.js scripts to:

1. **Compress Images** (including HEIC support) and optionally save size data to an Excel file.
2. **Upload Compressed Images to Dropbox** and generate shared links, saving them to an Excel file.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Directory Structure](#directory-structure)
- [Usage](#usage)
  - [1. Compress Images](#1-compress-images)
  - [2. Upload to Dropbox](#2-upload-to-dropbox)
- [Scripts Overview](#scripts-overview)
  - [`compress_image_mp.js`](#compress_image_mpjs)
  - [`dropbox_upload.js`](#dropbox_uploadjs)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Prerequisites

- **Node.js** v14+
- **npm** (Node Package Manager)
- A valid **Dropbox API access token** (for the Dropbox upload script)

---

## Installation

1. **Clone the repository** (or download the files) to your local machine:

   ```bash
   git clone https://github.com/prakharaug/image-compressor-sharp.git
   cd image-compressor-sharp
   ```
2. **Install dependencies**:

   ```bash
   npm install
   ```

   This will install:

   - [sharp](https://www.npmjs.com/package/sharp) (for image resizing & conversion)
   - [exceljs](https://www.npmjs.com/package/exceljs) (for generating Excel files)
   - [heic-convert](https://www.npmjs.com/package/heic-convert) (for converting HEIC to PNG)
   - [dropbox](https://www.npmjs.com/package/dropbox) and `node-fetch` (for Dropbox SDK)
   - [dotenv](https://www.npmjs.com/package/dotenv) (for environment variable management)

---

## Configuration

1. **Environment Variables**Create a `.env` file in the project root containing your Dropbox access token:

   ```dotenv
   ACCESS_TOKEN=your_dropbox_access_token_here
   ```

   - `ACCESS_TOKEN`: Your Dropbox API access token (required by `dropbox_upload.js`).
2. **Directory Names**

   - For **image compression**, the default input directory is `_Original_Images`
   - The compressed images will be written to `_Compressed_Images`
   - You can change these directory names directly in `compress_image_mp.js` if needed.
3. **Dropbox Base Folder**
   In `dropbox_upload.js`, set:

   ```js
   // Base Dropbox folder where images will be uploaded
   const DROPBOX_BASE_FOLDER = '/2025 02 14';
   ```

   Update `'/2025 02 14'` to your desired Dropbox folder path.

---

## Directory Structure

```text
your-repo-name/
│
├── _Original_Images/          # Place all original images (JPG, PNG, HEIC, etc.) here
│
├── _Compressed_Images/        # Will be created automatically by the compressor script
│   └── (subfolders / files)   # Compressed .webp files will appear here
│
├── compress_image_mp.js       # Script to recursively compress images + export Excel
├── dropbox_upload.js          # Script to upload compressed images to Dropbox + export Excel
├── Image_Sizes.xlsx           # (Generated after running compression; lists original vs. compressed sizes)
├── _Compressed_Images/      
│   └── image_links.xlsx       # Generated Excel with Dropbox shared links (after running the uploader)
│
├── .env                       # Your environment variables (e.g., ACCESS_TOKEN)
├── package.json
└── README.md                  # ← (this file)
```

> **Note:** The compressor script will create the `_Compressed_Images` folder if it does not already exist.
> Likewise, the Dropbox script will place `image_links.xlsx` inside the `_Compressed_Images` folder after uploading.

---

## Usage

### 1. Compress Images

1. **Prepare**

   - Place all source images (supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`) inside the `_Original_Images` directory.
   - Ensure `_Original_Images` exists at the project root.
2. **Run the Compressor**

   ```bash
   node compress_image_mp.js
   ```

   - The script will:
     1. Scan `_Original_Images` recursively (subfolders included).
     2. Convert any `.heic` files to PNG before compression.
     3. Resize images so that they do not exceed **20 megapixels** (configurable).
     4. Save compressed output as `.webp` files to the mirrored directory structure inside `_Compressed_Images`.
     5. Skip any files that are already compressed (by checking if the target `.webp` exists).
     6. Log progress to the console.
3. **Excel Report**

   - If `SAVE_EXCEL` is set to `true` in `compress_image_mp.js` (default), an `Image_Sizes.xlsx` file will be generated at the project root, containing:
     - File Name
     - Original Size (Bytes)
     - Compressed Size (Bytes)

---

### 2. Upload to Dropbox

> **Prerequisite:** Ensure you have already run the compressor script so that the `_Compressed_Images` folder exists and contains `.webp` files.

1. **Configure**

   - Verify your Dropbox access token is set in `.env`.
   - Adjust `DROPBOX_BASE_FOLDER` (in `dropbox_upload.js`) to your preferred Dropbox path.
2. **Run the Dropbox Uploader**

   ```bash
   node dropbox_upload.js
   ```

   - The script will:
     1. Recursively traverse `_Compressed_Images` (including any subfolders).
     2. Create corresponding folders inside Dropbox under the path specified by `DROPBOX_BASE_FOLDER`.
     3. Upload each compressed image, overwriting if it already exists.
     4. Generate a shared link (direct download) for each uploaded file.
     5. Accumulate an array of `{ FileName, Link }` objects.
     6. At the end, save these links to `image_links.xlsx` (inside `_Compressed_Images`).
3. **Result**

   - After successful execution, you will have `image_links.xlsx` inside `_Compressed_Images/`, which lists:
     - **FileName**: Full Dropbox path (lower‐cased).
     - **Link**: A direct-download URL (`dl=1`).

---

## Scripts Overview

### `compress_image_mp.js`

1. **Imports**

   - `sharp`: Image processing (resize & conversion).
   - `fs` & `path`: File system traversal.
   - `exceljs`: Creating an Excel workbook.
   - `heic-convert`: Converting `.heic` → PNG.
2. **Configuration Constants**

   ```js
   const inputDir = '_Original_Images';
   const outputDir = '_Compressed_Images';
   const MAX_MEGAPIXELS = 20;    // Maximum allowed megapixels before downscaling
   const OUTPUT_FORMAT = 'webp';
   const QUALITY = 85;           // WebP quality (0–100)
   const SAVE_EXCEL = true;      // Toggle Excel report generation
   ```
3. **Workflow**

   - Create `_Compressed_Images` folder if missing.
   - `processImages(inputDir, outputDir)`:
     - Recursively iterates through every file and subfolder in `_Original_Images`.
     - Skips non-image files.
     - Converts `.heic` → PNG buffer, then compresses/resizes (if needed) and saves as `.webp`.
     - Stores `{ fileName, originalSize, compressedSize }` in an array.
   - After processing, if `SAVE_EXCEL` is `true`, call `saveToExcel(...)` to create `Image_Sizes.xlsx`.
4. **Error Handling**

   - Logs any errors per file, but continues processing other files.

---

### `dropbox_upload.js`

1. **Imports**

   - `Dropbox` (from `dropbox` SDK) & `node-fetch`.
   - `fs` & `path`: File system traversal.
   - `exceljs`: Creating an Excel workbook.
   - `dotenv`: Reading environment variables.
2. **Configuration Constants**

   ```js
   const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
   const dbx = new Dropbox({ accessToken: ACCESS_TOKEN, fetch });
   const DROPBOX_BASE_FOLDER = '/2025 02 14'; // Base path in Dropbox
   const imagesFolder = '_Compressed_Images';  // Local folder to upload
   ```
3. **Workflow**

   - `uploadImagesAndGenerateLinks(imagesFolder)`:
     1. Verify `_Compressed_Images` exists locally.
     2. Call `processFolder(localFolder, dropboxFolder, imageLinks)`:
        - Ensure the corresponding Dropbox folder exists (creates if missing).
        - Recursively upload files and subfolders:
          - For each file:
            - `uploadFile(localPath, dropboxPath)` uploads (overwrite mode).
            - `getSharedLink(dropboxPath)` retrieves (or creates) a direct-download shared link.
            - Accumulates `{ FileName: dropboxPath, Link }` into `imageLinks`.
     3. After all uploads, write `image_links.xlsx` (inside `_Compressed_Images`) with columns:
        - **FileName** (Dropbox path)
        - **Link** (direct download URL)
4. **Error Handling**

   - Any upload/folder-creation errors are logged to the console (with `error.message`).

---

## Customization

1. **Adjust Quality / Resolution**

   - In `compress_image_mp.js`, modify:
     ```js
     const MAX_MEGAPIXELS = 20;   // Maximum resolution threshold (in megapixels)
     const OUTPUT_FORMAT = 'webp';
     const QUALITY = 85;          // WebP output quality (0–100)
     const SAVE_EXCEL = true;     // Set to `false` to skip generating Image_Sizes.xlsx
     ```
   - You may also change `inputDir` and `outputDir` to your preferred folder names.
2. **Change Dropbox Folder Path**

   - In `dropbox_upload.js`, update:
     ```js
     const DROPBOX_BASE_FOLDER = '/2025 02 14';
     ```
   - Use any valid Dropbox path (e.g., `/MyApp/CompressedImages`).
3. **Environment Variables**

   - You can store additional config in `.env` (e.g., different Dropbox token or folder names) and adjust the code to read those values.

---

## Troubleshooting

1. **`Error: Cannot find module 'sharp'` (or any dependency)**

   - Run `npm install` to ensure all dependencies are installed.
2. **Missing `_Original_Images` or `_Compressed_Images` directories**

   - Make sure you have created `_Original_Images` in the project root before running `compress_image_mp.js`.
   - The compressor script will auto-create `_Compressed_Images`, but if your OS has permission restrictions, create it manually and grant write access.
3. **HEIC Conversion Failures**

   - Make sure `heic-convert` is installed:
     ```bash
     npm install heic-convert
     ```
   - Some HEIC files may have uncommon encodings; check that your `.heic` images are valid.
4. **Dropbox Authentication Errors**

   - Ensure your `.env` file contains a valid `ACCESS_TOKEN`.
   - Confirm no trailing spaces or line breaks in the token.
   - If you receive “Invalid access token” from Dropbox, generate a new token via the Dropbox App Console.
5. **Excel File Won’t Generate**

   - Verify `SAVE_EXCEL` is set to `true` (for the compressor).
   - For Dropbox, ensure the script finished without errors, then look for `image_links.xlsx` inside `_Compressed_Images`.

---

## License

This project is released under the [MIT License](LICENSE). Feel free to modify and redistribute as needed.

---

> **Enjoy!**
> If you encounter any issues or have suggestions for improvement, please open an issue or submit a pull request.
