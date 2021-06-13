App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    balance: '0',
    certificationInstance: null,

    init: function () {
        return App.initWeb3();
    },

    initWeb3: async function () {
        /* Web3:
         * web3.js is a javascript library that allows our client-side
         * application to talk to the blockchain. We configure web3 here.
         */

        if (typeof web3 === 'undefined') {
            // Metamask not installed (not included in html scripts)
            App.onConnectionFailed("Metamask not installed");
            return;
        }

        // setup web3 for using ethereum
        if (window.ethereum) {
            // If a web3 instance is already provided by Metamask.
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } 
        else {
            // Specify default instance if no web3 instance provided
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
            web3 = new Web3(App.web3Provider);
        }

        web3.eth.handleRevert = true;

        try {
            App.account = await App.getAccount();
            App.balance = await App.getAccountBalance(App.account);

            // reload page if account changes
            window.ethereum.on('accountsChanged', function (accounts) {
                location.reload();
            });

            $('#account-address').text("Addr.: " + App.account);
            $('#account-balance').text("Bal.: " + App.balance + ' ETH');
        }
        catch(err) {
            console.log(err);
        }
        

        await window.ethereum.enable();

        // initialize contract
        return App.initContract();
    },

    onConnectionFailed: function (msg) {
        console.log(msg);
        // window.location.href = './help.html';
        return;
    },

    initContract: function () {
        $.getJSON('Certification.json', function (certification) {
            // Instantiate a new truffle contract from the artifact
            App.contracts.Certification = TruffleContract(certification);
            
            // Connect provider to interact with contract
            App.contracts.Certification.setProvider(App.web3Provider);
            
            var evt = $.Event('onContractReady');
            $(window).trigger(evt);
        });
    },

    getAccount: async function () {
        var accounts = await web3.eth.getAccounts();

        if (accounts.length == 0) {
            // no active Metamask account found
            App.onConnectionFailed("Failed to get Account");
        }
        else {
            // successfully get user account
            console.log('User is logged in to MetaMask');

            return accounts[0];
        }
    },

    getAccountBalance: async function (account) {
        // Load account data
        try {
            const balance = await web3.eth.getBalance(account);
            return web3.utils.fromWei(balance, 'ether');
        }
        catch(err) {
            console.log(err);
            App.onConnectionFailed("Failed to get Account Balance");
        }
        // =<>= (Angela)
    },

    getOwnerRecords: async function (address) {
        return App.contracts.Certification.deployed()
            .then(async function (instance) {
                const recordCount = await instance.getOwnerRecordCount(address);
                
                var records = [];
                for (let i = 0; i < recordCount; i++) {
                    var record = await instance.ownerRecords(address, i);
                    record = App.parseRecord(record);
                    records.push(record);
                }
                return records;
            })
            .catch(function (error) {
                console.warn(error);
            });
    },

    getBaseRecordId: function (recordId) {
        return App.contracts.Certification.deployed()
        .then(async function (instance) {
            return await instance.getBaseRecordId(recordId);
        })
        .catch(function (error) {
            console.warn(error);
        });
    },

    getRecord: function (recordId) {
        return App.contracts.Certification.deployed()
            .then(async function (instance) {
                const record = await instance.records(recordId);
                return App.parseRecord(record);
            })
            .catch(function (error) {
                console.warn(error);
            });
    },

    getNextRecord: function (recordId) {
        return App.contracts.Certification.deployed()
            .then(async function (instance) {
                const nextRecordId = await instance.recordIdToNext(recordId);
                if (!nextRecordId || parseInt(nextRecordId) == 0) {
                    return;
                }
                const record = await instance.records(nextRecordId);
                return App.parseRecord(record);
            })
            .catch(function (error) {
                console.warn(error);
            });
    },

    addRecord: async function (latlong, date, weight, quantity, conformity) {
        return App.contracts.Certification.deployed()
            .then(function (instance) {
                const latlongBytes = web3.utils.asciiToHex(latlong);
                const dateBytes = web3.utils.asciiToHex(date);
                return instance.addRecord(latlongBytes, dateBytes, weight, quantity, conformity, { from: App.account });
            })
            .catch(function (error) {
                console.warn(error);
            });
    },

    transferRecord: async function (recordId, buyerAddress, latlong, date, price, weight, quantity) {
        return App.contracts.Certification.deployed()
            .then(function (instance) {
                const latlongBytes = web3.utils.asciiToHex(latlong);
                const dateBytes = web3.utils.asciiToHex(date);
                const priceBytes = web3.utils.asciiToHex(price);
                return instance.transferRecord(recordId, buyerAddress, latlongBytes, dateBytes, priceBytes, weight, quantity, { from: App.account });
            })
            .catch(function (error) {
                console.warn(error);
            });
    },

    parseRecord: function (record)  {
        record.latlong = web3.utils.hexToAscii(record.latlong);
        record.date = web3.utils.hexToAscii(record.date);
        record.price = web3.utils.hexToAscii(record.price);
        return record;
    },
};

window.addEventListener('load', function () {
    App.init();
});
