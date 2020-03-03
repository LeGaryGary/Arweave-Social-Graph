import Arweave from 'arweave/web';
import { and, equals } from 'arql-ops';

const arweaveOptions = {
    host: 'arweave.net',// Hostname or IP address for a Arweave node
    port: 443,           // Port, defaults to 1984
    protocol: 'https',  // Network protocol http or https, defaults to http
    timeout: 30000,     // Network request timeouts in milliseconds
    logging: false,     // Enable network request logging
};

export const arweave = Arweave.init(arweaveOptions);

var fx = function (a) {
    return function (b) {
        return [a, b]
    }
}

export var GetWalletFromMnemonic = fx((dispatch, props) => {
    let publicKey = "";
    const words = props.mnemonic.split(" ");
    if (words.length != 12) {
        dispatch(props.errorAction, 'Please enter 12 words');
    }
    words.forEach((word, index) => {
        if (index <= 3) {
            publicKey += word;
        }
    });
    publicKey = btoa(publicKey);

    return arweave.arql({
        op: "and",
        expr1: {
            op: "equals",
            expr1: "ar-auth-public-key",
            expr2: publicKey
        },
        expr2: {
            op: "equals",
            expr1: "app-id",
            expr2: "ar-auth"
        }
    }).then((transactions) => {
        var transactionId = transactions[0];
        return arweave.transactions.get(transactionId)
    }).then((transactionDetails) => {
        const data = transactionDetails.get('data', { decode: true, string: true });
        const encryptedWallet = CryptoJS.AES.decrypt(data, props.mnemonic);
        const stringWallet = encryptedWallet.toString(CryptoJS.enc.Utf8);
        const userWallet = JSON.parse(stringWallet);
        return arweave.wallets.jwkToAddress(userWallet).then((address) => {
            dispatch(props.action, { address: address, keyStore: userWallet });
        }).catch((error) => {
            console.log(error);
            dispatch(props.errorAction, 'Invalid wallet')
        });
    }).catch((error) => {
        console.log(error);
        dispatch(props.errorAction, 'Invalid passphrase')
    });
})

export var LoadSingleProject = fx((dispatch, props) => {
    const query = and(
        FromWallet(props.address),
        FromApp(),
        IsType('Repository'),
        Project(props.projectName));

    arweave.arql(query)
        .then((transactionIds) => arweave.transactions.get(transactionIds[0]))
        .then((transaction) => {
            const project = transaction.get('data', { decode: true, string: true });
            dispatch(props.setProjectAction, JSON.parse(project));
        }).catch((error) => {
            console.log(error);
            dispatch(props.setProjectAction, null);
            dispatch(props.errorAction, 'Error loading project');
        });
})

function FromWallet(address) {
    return equals('from', address);
}

function IsType(type) {
    return equals('Type', type);
}

function AddAppName(transaction) {
    transaction.addTag('App-Name', 'GitWeave');
    return { 'App-Name': 'GitWeave' };
}

function AddType(transaction, type) {
    transaction.addTag('Type', type);
    return { 'Type': type };
}

function AddProjectName(transaction, projectName) {
    transaction.addTag('Repository-Name', projectName);
    return { 'Repository-Name': projectName };
}