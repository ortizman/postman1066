const useMock = process.env.USE_MOCK || true;
const backURL = process.env.BACK_URL || 'http://localhost:3001';
const getCollection = async (collectionUrl) => {
    if (useMock) {
        // await sleep(3000)
        return require('./dummy.json');
    } else {
        //return fetch(`https://api.getpostman.com/collections/${collectionUID}?apikey=${apiKey}`).then(res => res.json());
        return fetch(backURL + '?collectionUrl=' + collectionUrl)
                .then(res => res.json())
                .catch(err => console.log)

    }

}

module.exports = {
    getCollection
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}