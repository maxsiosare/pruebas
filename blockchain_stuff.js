const NETWORK_ID = 80001
const TOKEN_CONTRACT_ADDRESS = "0x5823dA2AB4b117c53f43C39F7b8aA7eeE45E4327"
const MARKETPLACE_CONTRACT_ADDRESS = "0xaDE5f5F0C1a4E9bbe9e66a6901c1bC7797CCe8Ae"
const TOKEN_CONTRACT_JSON_PATH = "./NFTContract.json"
const MARKETPLACE_CONTRACT_JSON_PATH = "./MarketplaceContract.json"
var token_contract
var marketplace_contract
var accounts
var web3
var balance
var price
var price2
var pTotal


function metamaskReloadCallback()
{
  window.ethereum.on('accountsChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Accounts changed, refreshing...";
    window.location.reload()
  })
  window.ethereum.on('networkChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Network changed, refreshing...";
    window.location.reload()
  })
}

const getWeb3 = async () => {
  return new Promise((resolve, reject) => {
    if(document.readyState=="complete")
    {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum)
        window.location.reload()
        resolve(web3)
      } else {
        reject("must install MetaMask")
        document.getElementById("web3_message").textContent="Error: Please connect to Metamask";
      }
    }else
    {
      window.addEventListener("load", async () => {
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum)
          resolve(web3)
        } else {
          reject("must install MetaMask")
          document.getElementById("web3_message").textContent="Error: Please install Metamask";
        }
      });
    }
  });
};

const getContract = async (web3, contract_json_path, contract_address) => {
  const response = await fetch(contract_json_path);
  const data = await response.json();

  const netId = await web3.eth.net.getId();
  contract = new web3.eth.Contract(
    data,
    contract_address
    );
  return contract
}

async function loadDapp() {
  metamaskReloadCallback()
  document.getElementById("web3_message").textContent="Cargando..."
  var awaitWeb3 = async function () {
    web3 = await getWeb3()
    web3.eth.net.getId((err, netId) => {
      if (netId == NETWORK_ID) {
        var awaitContract = async function () {
          token_contract = await getContract(web3, TOKEN_CONTRACT_JSON_PATH, TOKEN_CONTRACT_ADDRESS)
          marketplace_contract = await getContract(web3, MARKETPLACE_CONTRACT_JSON_PATH, MARKETPLACE_CONTRACT_ADDRESS)
          await window.ethereum.request({ method: "eth_requestAccounts" })
          accounts = await web3.eth.getAccounts()
          balance = await token_contract.methods.balanceOf(accounts[0]).call()
          price = await token_contract.methods.PRICEWL().call()
          price2 = await token_contract.methods.calculatePrice().call()
          for(i=0; i<balance; i++)
         
          {
            nft_id = await token_contract.methods.tokenOfOwnerByIndex(accounts[0],i).call()
            insertMyTokenHTML(nft_id)
          }

          my_listings_count = await marketplace_contract.methods.getListingsByOwnerCount(accounts[0]).call()
          for(i=0; i<my_listings_count; i++)
          {
            listing_id = await marketplace_contract.methods.getListingsByOwner(accounts[0], i).call()
            insertMyListingHTML(listing_id)
          }

          active_listing_count = await marketplace_contract.methods.getActiveListingsCount().call()
          for(i=0; i<active_listing_count; i++)
          {
            listing_id = await marketplace_contract.methods.getActiveListings(i).call()
            insertActiveListingHTML(listing_id)
          }

          if(balance == 1)
            document.getElementById("web3_message").textContent="You have 1 token"
          else
            document.getElementById("web3_message").textContent="You have " + balance + " tokens"
        };
        awaitContract();
      } else {
        document.getElementById("web3_message").textContent="Please connect to Rinkeby";
      }
    });
  };
  awaitWeb3();
}

function insertMyTokenHTML(nft_id)
{
  //Token number text
  var token_element = document.createElement("p")
  token_element.innerHTML = "Token #" + nft_id
  document.getElementById("my_nfts").appendChild(token_element)

  //Approve Button
  let approve_btn = document.createElement("button")
  approve_btn.innerHTML = "Approve"
  document.getElementById("my_nfts").appendChild(approve_btn)
  approve_btn.onclick = function () {
    approve(MARKETPLACE_CONTRACT_ADDRESS, nft_id)
  }

  //Price
  var input = document.createElement("input")
  input.type = "text"
  input.value = "Price"
  input.id = "price" + nft_id
  document.getElementById("my_nfts").appendChild(input)

  //Sell Button
  let mint_btn = document.createElement("button")
  mint_btn.innerHTML = "Sell"
  document.getElementById("my_nfts").appendChild(mint_btn)
  mint_btn.onclick = function () {
    price = document.getElementById("price" + nft_id).value;
    addListing(nft_id, web3.utils.toWei(price))
  }
}

async function insertMyListingHTML(listing_id)
{
  listing = await marketplace_contract.methods.listings(listing_id).call()
  //Token number text
  var token_element = document.createElement("p")
  token_element.innerHTML = "Token #" + listing.token_id + " (price: "+ web3.utils.fromWei(listing.price) +")"
  document.getElementById("my_listings").appendChild(token_element)

  //Delist Button
  let delist_btn = document.createElement("button")
  delist_btn.innerHTML = "Delist"
  document.getElementById("my_listings").appendChild(delist_btn)
  delist_btn.onclick = function () {
    removeListing(listing_id)
  }
}

async function insertActiveListingHTML(listing_id)
{
  listing = await marketplace_contract.methods.listings(listing_id).call()
  //Token number text
  var token_element = document.createElement("p")
  token_element.innerHTML = "Token #" + listing.token_id + " (price: "+ web3.utils.fromWei(listing.price) +")"
  document.getElementById("all_listings").appendChild(token_element)

  //Delist Button
  let delist_btn = document.createElement("button")
  delist_btn.innerHTML = "Buy"
  document.getElementById("all_listings").appendChild(delist_btn)
  delist_btn.onclick = function () {
    buy(listing_id, listing.price)
  }
}
const mintwl = async () => {
    let mint_amount = document.getElementById("mint_amount").value
    const result = await token_contract.methods.mintwl(accounts[0], mint_amount)
      .send({ from: accounts[0], gas: 0, value: price* mint_amount })
      .on('transactionHash', function(hash){
        document.getElementById("web3_message").textContent="Minting...";
      })
      .on('receipt', function(receipt){
        document.getElementById("web3_message").textContent="Success! Minting finished.";    })
      .catch((revertReason) => {
        getRevertReason(revertReason.receipt.transactionHash);
      });
  
       
  }

  const editWhitelistReserved = async () => {
    const result = await token_contract.methods.editWhitelistReserved(
      [
        "0x4BeA7E89321bb90B735a8467fD968B8cb0da9b63",
        "0xF5752F93454Ffd777dabA7DD086d81a42094B57E"
      ],
      [
        1,
        1
       
      ]
      )
      .send({ from: accounts[0], gas: 0, value: 0 })
      .on('transactionHash', function(hash){
        document.getElementById("web3_message").textContent="Minting...";
      })
      .on('receipt', function(receipt){
        document.getElementById("web3_message").textContent="Success! Minting finished.";    })
      .catch((revertReason) => {
        getRevertReason(revertReason.receipt.transactionHash);
      });
  }

  
const mint = async () => {
    let mint_amount = document.getElementById("mint_amount").value
    const result = await token_contract.methods.mint(accounts[0], mint_amount)
      .send({ from: accounts[0], gas: 0, value: price2 * mint_amount })
      .on('transactionHash', function(hash){
        document.getElementById("web3_message").textContent="Minting...";
      })
      .on('receipt', function(receipt){
        document.getElementById("web3_message").textContent="Success! Minting finished.";    })
      .catch((revertReason) => {
        getRevertReason(revertReason.receipt.transactionHash);
      });
  
       
  }

  const reserveGiveaway = async () => {
    let mint_amount = document.getElementById("mint_amount").value
    const result = await token_contract.methods.reserveGiveaway(accounts[0], mint_amount)
    .send({ from: accounts[0], gas: 0})
      .on('transactionHash', function(hash){
        document.getElementById("web3_message").textContent="Minting...";
      })
      .on('receipt', function(receipt){
        document.getElementById("web3_message").textContent="Success! Minting finished.";    })
      .catch((revertReason) => {
        getRevertReason(revertReason.receipt.transactionHash);
      });
    }

/*const mint3 = async () => {
  const result = await token_contract.methods.reserveGiveaway()
    .send({ from: accounts[0], gas: 0 })
    .on('transactionHash', function(hash){
      document.getElementById("web3_message").textContent="Minting...";
    })
    .on('receipt', function(receipt){
      document.getElementById("web3_message").textContent="Success!";    })
    .catch((revertReason) => {
      console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
    });
}*/

const approve = async (contract_address, token_id) => {
  const result = await token_contract.methods.approve(contract_address, token_id)
    .send({ from: accounts[0], gas: 0 })
    .on('transactionHash', function(hash){
      document.getElementById("web3_message").textContent="Approving...";
    })
    .on('receipt', function(receipt){
      document.getElementById("web3_message").textContent="Success!";    })
    .catch((revertReason) => {
      console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
    });
}

const addListing = async (token_id, price) => {
  const result = await marketplace_contract.methods.addListing(token_id, price)
    .send({ from: accounts[0], gas: 0 })
    .on('transactionHash', function(hash){
      document.getElementById("web3_message").textContent="Adding listing...";
    })
    .on('receipt', function(receipt){
      document.getElementById("web3_message").textContent="Success!";    })
    .catch((revertReason) => {
      console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
    });
}

const removeListing = async (listing_id) => {
  const result = await marketplace_contract.methods.removeListing(listing_id)
    .send({ from: accounts[0], gas: 0 })
    .on('transactionHash', function(hash){
      document.getElementById("web3_message").textContent="Removing from listings...";
    })
    .on('receipt', function(receipt){
      document.getElementById("web3_message").textContent="Success!";    })
    .catch((revertReason) => {
      console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
    });
}

const buy = async (listing_id, price) => {
  const result = await marketplace_contract.methods.buy(listing_id)
    .send({ from: accounts[0], gas: 0, value: price })
    .on('transactionHash', function(hash){
      document.getElementById("web3_message").textContent="Buying...";
    })
    .on('receipt', function(receipt){
      document.getElementById("web3_message").textContent="Success!";    })
    .catch((revertReason) => {
      console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
    });
}
loadDapp()
