const fs = require('fs');

const axios = require('axios');
require('dotenv').config();

const SUPER_SECRET_DATA_FILE = './super-secret-data.txt';

const readDataFile = () => fs.readFileSync(SUPER_SECRET_DATA_FILE).toString().split('\n').filter(i => i !== '');

const splitArrayInBatches = array => {
    const newArray = [];
    const chunkSize = 1000;
    for (let i = 0; i < array.length; i += chunkSize) {
        newArray.push(array.slice(i, i + chunkSize));
    }
    return newArray;
}

const decryptionApiRequest = async input => {
    try {
        const { data } = await axios({
            method: 'post',
            url: 'https://txje3ik1cb.execute-api.us-east-1.amazonaws.com/prod/decrypt',
            headers: {
                'x-api-key': process.env.API_KEY
            },
            data: input,
        });
        
        return data.map(i => JSON.parse(i));
    } catch (e) {
        console.log('Error:getData', e);
        return [];
    }
}

const decryptData = async input => {
    const chunkedDataArray = splitArrayInBatches(input);
    let decryptedData = [];

    await Promise.all(chunkedDataArray.map(async (array, i) => {
        //Added some delay between the requests in order to not exceed the maximum requests per minute, 
        if(chunkedDataArray.length > 25) await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        console.log(`Decrypting: ${i * 1000 + array.length}/${input.length}`);
        const newItems = await decryptionApiRequest(array);
        decryptedData = [...decryptedData, ...newItems];
    }));

    const filteredData = [];
    decryptedData.forEach(i => {
        if(filteredData.find(j => i.name === j.name) === undefined) filteredData.push(i);
    })

    return filteredData;
}

const getHomeWorldData = async url => {
    try {
        // Changed URL as swapi.co is now unmaintained
        const { data } = await axios(`https://swapi.dev${url.split('https://swapi.co')[1]}`);
        return data.name;
    } catch(e) {
        return url;
    }
}

const printOutput = async data => {
    const homeWorlds = [...new Set(data.map(i => i.homeworld))];
    fs.writeFileSync('./citizens-super-secret-info.txt', '');

    await Promise.all(homeWorlds.map(async world => {
        let content = '';
        content += `${await getHomeWorldData(world)}\n`;
        data.filter(i => i.homeworld === world).forEach(i => {
            content += `- ${i.name}\n`;
         });
        content += `\n`;
        fs.appendFileSync('./citizens-super-secret-info.txt', content);
    }));
}

const hasApiKey = () => {
    if (!process.env.API_KEY) {
        console.log('Please fill the created .env file with your API_KEY');
        fs.writeFileSync('./.env', 'API_KEY=Paste your api key here');
        return false;
    }
    return true;
}

const init = async () => {
    try {
        if(!hasApiKey()) return;
        const inputData = readDataFile();
        const decryptedData = await decryptData(inputData);
        await printOutput(decryptedData);
        console.log('Citizens super secret info fetched.')
    } catch (e) {
        console.log('Error:init', e);
    }
}

init();