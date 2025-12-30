// dms-dev/backend/scripts/migrate-cloudinary.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);
const prisma = new PrismaClient();

// CONFIGURATION
const UPLOAD_DIR = '/home/fortytwoev/dms-data/uploads/prod'; // Using PROD folder for safety
const BASE_URL = '/uploads/';

async function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {}); // Delete partial file
            reject(err);
        });
    });
}

async function main() {
    console.log('🚀 Starting Cloudinary Migration...');

    // 1. Ensure Directory Exists
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // 2. Find files still using Cloudinary
    const files = await prisma.file.findMany({
        where: {
            url: { contains: 'cloudinary.com' }
        }
    });

    console.log(`Found ${files.length} files to migrate.`);

    for (const file of files) {
        try {
            // Generate local filename (keep extension)
            const ext = path.extname(file.filename) || '.jpg';
            // Use publicId or ID as filename to avoid conflicts
            const localFilename = `migrated-${file.id}${ext}`;
            const localPath = path.join(UPLOAD_DIR, localFilename);
            const localUrl = `${BASE_URL}${localFilename}`;

            console.log(`Downloading: ${file.filename}...`);

            // Download
            await downloadFile(file.url, localPath);

            // Update Database
            await prisma.file.update({
                where: { id: file.id },
                data: {
                    url: localUrl,
                    publicId: null, // Clear Cloudinary ID
                    metadata: {
                        ...file.metadata,
                        migratedFromCloudinary: true,
                        originalUrl: file.url
                    }
                }
            });

            console.log(`✅ Migrated: ${file.filename}`);
        } catch (error) {
            console.error(`❌ Failed ${file.filename}:`, error.message);
        }
    }

    console.log('🎉 Migration Complete!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());