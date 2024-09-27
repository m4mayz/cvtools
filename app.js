let sortedFiles = []; 

document.getElementById('convertBtn').addEventListener('click', async function () {
    const maxContacts = parseInt(document.getElementById('maxContacts').value);
    const prefixStart = parseInt(document.getElementById('prefixStart').value);
    const nameFile = document.getElementById('nameFile').value;
    const nameContacts = document.getElementById('nameContacts').value;

    const adminContacts = document.getElementById('ctcAdmin').value.trim().split('\n').map(num => sanitizePhoneNumber(num));
    const navyContacts = document.getElementById('ctcNavy').value.trim().split('\n').map(num => sanitizePhoneNumber(num));
    const excludeNumbers = [...adminContacts, ...navyContacts];

    if (!maxContacts || !prefixStart || !nameContacts || !(sortedFiles.length > 0)) {
        alert('Please fill out all required fields.');
        return;
    }

    let vcfFileCounter = prefixStart; // Start file numbering from prefixStart
    const zip = new JSZip(); // Initialize a new JSZip instance

    // Process files sequentially using async/await
    for (const file of sortedFiles) {
        const fileContent = await readFileAsText(file); // Wait until file is fully read

        let listContacts;

        // Detect file type and process accordingly
        if (file.name.endsWith('.txt')) {
            // Process TXT file (phone numbers only)
            listContacts = fileContent.split('\n')
                .map(line => line.trim())
                .filter(line => /^[\d+]+$/.test(line) && !excludeNumbers.includes(sanitizePhoneNumber(line))); // Skip admin/navy numbers
        } else if (file.name.endsWith('.csv')) {
            // Process CSV file (name, phone number)
            listContacts = fileContent.split('\n').map(line => {
                const [name, phone] = line.split(','); // Assuming CSV format "name,phone"
                return { name: name.trim(), phone: phone ? phone.trim() : '' };
            }).filter(contact => /^[\d+]+$/.test(contact.phone) && !excludeNumbers.includes(sanitizePhoneNumber(contact.phone))); // Skip admin/navy numbers
        }

        // Split contacts into multiple VCF files based on maxContacts
        let batchContacts = [];

        for (let i = 0; i < listContacts.length; i += maxContacts) {
            batchContacts = listContacts.slice(i, i + maxContacts);
            
            // Generate VCF content for each batch
            let vcfContent = file.name.endsWith('.txt')
                ? generateVCFContacts(batchContacts, nameContacts)
                : generateVCFContactsCSV(batchContacts);

            // Add each VCF file to the ZIP
            let vcfFileName = `${nameFile}${vcfFileCounter}.vcf`;
            zip.file(vcfFileName, vcfContent);
            vcfFileCounter++; // Increment file number for each batch
        }
    }

    // Generate ZIP file and trigger download
    zip.generateAsync({ type: "blob" }).then(function (blob) {
        const zipFileName = `${nameFile}_file.zip`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = zipFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById('message').textContent = "Contacts converted and zipped successfully!";
});

// Function to read file content as text asynchronously
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            resolve(e.target.result);
        };
        reader.onerror = function (e) {
            reject(e);
        };
        reader.readAsText(file);
    });
}

document.getElementById('convertBtnAdmin').addEventListener('click', function () {
    const adminContacts = document.getElementById('ctcAdmin').value.trim().split('\n');
    const navyContacts = document.getElementById('ctcNavy').value.trim().split('\n');
    let vcfAdminContent = '';

    // Generate VCF content for Admin
    vcfAdminContent += generateVCFContacts(adminContacts, "ADMIN");

    // Generate VCF content for Navy
    vcfAdminContent += generateVCFContacts(navyContacts, "NAVY");

    // Trigger file download
    downloadVCF("ADMIN.vcf", vcfAdminContent);
    document.getElementById('message').textContent = "Contacts Admin & Navy converted successfully!";
});

function generateVCFContacts(contacts, groupName) {
    let content = '';
    let contactCounter = 1; // Contact numbering starts from 001 in each file

    contacts.forEach(contact => {
        if (contact.trim() !== '') {
            content += `BEGIN:VCARD\n\n`;
            content += `VERSION:3.0\n\n`;
            content += `FN:${groupName} ${String(contactCounter).padStart(3, '0')}\n\n`;
            content += `TEL;TYPE=CELL:+${sanitizePhoneNumber(contact)}\n\n`;
            content += `END:VCARD\n\n`;            
            contactCounter++;
        }
    });

    return content;
}

function generateVCFContactsCSV(contacts) {
    let content = '';
    let contactCounter = 1; // Contact numbering starts from 001 in each file

    contacts.forEach(contact => {
        if (contact.phone.trim() !== '') {
            content += `BEGIN:VCARD\n\n`;
            content += `VERSION:3.0\n\n`;
            content += `FN:${contact.name || 'Unknown'} ${String(contactCounter).padStart(3, '0')}\n\n`;
            content += `TEL;TYPE=CELL:+${sanitizePhoneNumber(contact.phone)}\n\n`;
            content += `END:VCARD\n\n`;            
            contactCounter++;
        }
    });

    return content;
}

function sanitizePhoneNumber(phoneNumber) {
    // Sanitize to remove invalid characters
    return phoneNumber.replace(/[^\d+]/g, ''); // Only allow numbers and '+' symbol
}

function downloadVCF(filename, content) {
    const blob = new Blob([content], { type: 'text/vcard' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.getElementById('fileInput').addEventListener('change', function(event) {
    const fileList = event.target.files;
    const fileArray = Array.from(fileList);

    // Extract filenames and sort them properly (numerically)
    sortedFiles = fileArray.sort((a, b) => {
        return naturalSort(a.name, b.name);
    });

    const fileListElement = document.getElementById('fileList');
    fileListElement.innerHTML = '';  // Clear the list before adding sorted files

    sortedFiles.forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.name;
        fileListElement.appendChild(li);
    });
});

// Function to sort filenames naturally (1.txt, 2.txt, 10.txt, etc.)
function naturalSort(a, b) {
    const regEx = /(\d+)|(\D+)/g;
    const aMatches = a.match(regEx);
    const bMatches = b.match(regEx);

    while (aMatches.length && bMatches.length) {
        const aMatch = aMatches.shift();
        const bMatch = bMatches.shift();
        const aIsNum = !isNaN(aMatch);
        const bIsNum = !isNaN(bMatch);

        if (aIsNum && bIsNum) {
            const diff = aMatch - bMatch;
            if (diff) return diff;
        } else if (aIsNum) {
            return -1;
        } else if (bIsNum) {
            return 1;
        } else if (aMatch !== bMatch) {
            return aMatch > bMatch ? 1 : -1;
        }
    }
    return aMatches.length - bMatches.length;
}
