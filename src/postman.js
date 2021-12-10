const useMock = process.env.REACT_APP_USE_MOCK || true;
const backURL = process.env.REACT_APP_BACK_URL || 'https://post1066.herokuapp.com';

export default async function getCollection(collectionUrl) {
    if (useMock) {
        // await sleep(3000)
        return require('./dummy.json');
    } else {
        //return fetch(`https://api.getpostman.com/collections/${collectionUID}?apikey=${apiKey}`).then(res => res.json());
        return fetch(backURL + '/collection?url=' + collectionUrl)
            .then(res => res.json())
            .catch(err => console.log);

    }
}