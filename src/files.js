import fs from 'fs';

const filename = 'models.json';

function read() {
    return JSON.parse(fs.readFileSync(filename));
}

function write(data) {
    fs.writeFileSync(filename, JSON.stringify(data));
}

export {
    read,
    write
};  
