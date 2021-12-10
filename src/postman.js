const useMock = process.env.REACT_APP_USE_MOCK || false;
const backURL = process.env.REACT_APP_BACK_URL || 'https://post1066.herokuapp.com';

export default async function getCollection(collectionUrl) {
    if (useMock) {
        return require('./dummy.json');
    } else {
        return fetch(backURL + '/collection?url=' + collectionUrl)
            .then(res => res.json())
            .catch(err => console.log);

    }
}