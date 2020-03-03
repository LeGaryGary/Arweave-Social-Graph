import { GetWalletFromMnemonic, LoadProjectsFromWallet, LoadSingleProject, CreateProjectTransaction, PostTransaction } from '../effects/Arweave';
import { SetWalletToStorage, RemoveWalletFromStorage } from '../effects/LocalStorage';
import { AskLogout } from '../effects/Alert';

export var CreateProject = state => [
    {
        ...state,
        creatingProject: true
    },
    CreateProjectTransaction({
        wallet: state.wallet,
        projectName: state.newProjectName,
        description: state.newProjectDescription,
        action: ConfirmTransaction,
        errorAction: ErrorNotification,
    })
]

export var ConfirmTransaction = (state, confirmTransaction) => {
    return {
        ...state,
        confirmTransaction
    }
}

export var SendTransaction = (state, transaction) => [
    state,
    PostTransaction({
        transaction,
        action: InfoNotification,
        errorAction: ErrorNotification
    })
]

export var Login = state => [
    {
        ...state,
        loggingIn: true
    },
    GetWalletFromMnemonic({
        action: SetWallet,
        errorAction: ErrorNotification,
        mnemonic: state.mnemonic
    })
];

export var CheckLogout = state => {
    if (state.loggedIn) {
        return [
            state,
            AskLogout({
                action: Logout
            })
        ]
    }
    else return state;
};


export var Logout = state => [
    {
        ...state,
        wallet: null,
        mnemonic: null,
        loggedIn: false
    },
    RemoveWalletFromStorage()
];

export var LoadProject = (state, address, projectName, location) => [
    {
        ...state,
        loadingProject: true
    },
    LoadSingleProject({
        setProjectAction: SetProject,
        errorAction: ErrorNotification,
        address,
        projectName,
        location
    })
];

export var SetLocation = (state, location) => {
    window.location = '#' + location;
    const parts = location.split('/');
    const newState = {
        ...state,
        location
    };
    if (parts.length == 2) {
        return LoadProject(newState, parts[0], parts[1], location);
    }
    return newState;
};

export var SetWallet = (state, wallet) => {
    return [
        {
            ...state,
            wallet,
            loggingIn: false,
            loggedIn: true,
            loadingYourProjects: true
        },
        LoadProjectsFromWallet({
            action: SetYourProjects,
            errorAction: ErrorNotification,
            wallet: wallet
        }),
        SetWalletToStorage({
            wallet: wallet
        })
    ];
};

export var ErrorNotification = (state, error) => {
    var snackbar = document.getElementById("snackbar-error");
    snackbar.className = "show";
    snackbar.innerText = error;
    setTimeout(function () { snackbar.className = snackbar.className.replace("show", ""); }, 3000);
    console.log('Error: ', error);
    return state;
};

var InfoNotification = (state, info) => {
    var snackbar = document.getElementById("snackbar-info");
    snackbar.className = "show";
    snackbar.innerText = info;
    setTimeout(function () { snackbar.className = snackbar.className.replace("show", ""); }, 3000);
    console.log('Info: ', info);
    return state;
};

export var SetMnemonic = (state, mnemonic) => ({ ...state, mnemonic });
export var SetProject = (state, project) => ({ ...state, project: project, loadingProject: false });
export var SetYourProjects = (state, projects) => ({ ...state, yourProjects: projects, loadingYourProjects: false });
export var SetPopularProjects = (state, projects) => ({ ...state, popularProjects: projects, loadingPopularProjects: false });