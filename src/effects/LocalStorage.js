var fx = function (a) {
    return function (b) {
        return [a, b]
    }
}

export var LoadWalletFromStorage = fx((dispatch, props) => {
    var wallet = JSON.parse(localStorage.getItem('wallet'));
    if (wallet){
        dispatch(props.action, wallet);
    }
    
});

export var SetWalletToStorage = fx((dispatch, props) => {
    var wallet = JSON.stringify(props.wallet);
    localStorage.setItem('wallet', wallet);
});

export var RemoveWalletFromStorage = fx((dispatch, props) => {
    localStorage.removeItem('wallet');
});