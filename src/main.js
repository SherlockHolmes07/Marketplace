import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import marketplaceAbi from "../contract/marketplace.abi.json";
import erc20Abi from "../contract/erc20.abi.json";

const ERC20_DECIMALS = 18;
const MPContractAddress = "0xde3e04987A00aB3b7CE2401dB665E4E7BD3E806b"; //Marketplace Contract Address
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; //Erc20 contract address

// list of categories
const Categories = [
  "Home Products",
  "Fashion & Beauty",
  "Toys & Games",
  "Electronics",
  "Automotive",
  "Books",
  "Cell Phones & Accessories",
  "Clothing & Shoes",
  "Computers",
  "Collectibles & Fine Arts",
  "Handmade",
  "Health & Fitness",
  "Sports & Outdoors",
  "Office Products",
  "Real Estate",
  "Others",
];

let kit;
let contract;
let products = [];
let Wishlist = [];

//Connects the wallet gets the account and initializes the contract
const connectCeloWallet = async function () {
  //Checks for the wallted
  if (window.celo) {
    notification("⚠️ Please approve this DApp to use it.");
    try {
      //enables the celo
      await window.celo.enable();
      notificationOff();

      const web3 = new Web3(window.celo);
      kit = newKitFromWeb3(web3);
      //gets the default account used
      const accounts = await kit.web3.eth.getAccounts();
      kit.defaultAccount = accounts[0];
      //calles for the contract using its abi and contract address
      contract = new kit.web3.eth.Contract(marketplaceAbi, MPContractAddress);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.");
  }
};

// Calls for the approval of the transcation
async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress);

  const result = await cUSDContract.methods
    .approve(MPContractAddress, _price)
    .send({ from: kit.defaultAccount });
  return result;
}

// gets the balance of the connected account
const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
  document.querySelector("#balance").textContent = cUSDBalance;
};

// gets all the products
const getProducts = async function () {
  const _productsLength = await contract.methods.getProductsLength().call();
  const _products = [];
  for (let i = 0; i < _productsLength; i++) {
    let _product = new Promise(async (resolve, reject) => {
      let p = await contract.methods.readProduct(i).call();
      resolve({
        index: i,
        owner: p[0],
        name: p[1],
        image: p[2],
        description: p[3],
        location: p[4],
        category: p[5],
        price: new BigNumber(p[6]),
        sold: p[7],
        number_items: p[8],
        status: p[9],
      });
    });
    if (_product.owner == "0x0000000000000000000000000000000000000000") {
      continue;
    }
    _products.push(_product);
  }
  products = await Promise.all(_products);
  await getWishlist();
  renderProducts();
};

const getWishlist = async()=>{
   try{
       Wishlist = await contract.methods.getWishlist().call();
   }
   catch(e){
        notification(`${e}`);
   }
};

// renders all the products in the products array
function renderProducts() {
  document.getElementById("marketplace").innerHTML = "";
  products.forEach((_product) => {
    const newDiv = document.createElement("div");
    newDiv.className = "col-md-4";
    newDiv.innerHTML = productTemplate(_product);
    document.getElementById("marketplace").appendChild(newDiv);
  });
}

//returns the template of the product
function productTemplate(_product) {
  let base =  `
    <div class="card mb-4">
      <img class="card-img-top" src="${_product.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        ${_product.sold} Sold
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_product.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_product.name}</h2>
        <p class="card-text mb-1" style="min-height: 65px">
          ${_product.description}             
        </p>
        <p class="card-text mt-1">
          <i class="bi bi-geo-alt-fill"></i>
          <span>${_product.location}</span>
        </p>
        <div class="d-grid gap-2">
          <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3" id=${
            _product.index
          }>
            Buy for ${_product.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
          </a>
        </div>
  `;

  if(Wishlist.includes(_product.index)){
      base += `<div class="d-grid gap-2 mt-2"> <a class="btn btn-lg btn btn-danger" id="wishlistBtn"
      onclick="removeFromWishlist(${_product.index})">Remove from Wishlist</a></div> </div> </div>`;
  }
  else{
      base += `<div class="d-grid gap mt-2"> <a class="btn btn-lg btn btn-pink" id="wishlistBtn" 
      onclick="addToWishlist(${_product.index})">Add to Wishlist</a></div> </div> </div>`;
  }
 
  return base;
}


//returns the template of the identifications
function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL();

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `;
}

// Generates the notification
function notification(_text, type) {
  if (type === "sucess") {
    document.querySelector(".alert").classList.remove("alert-light");
    document.querySelector(".alert").classList.add("alert-green");
  }
  document.querySelector(".alert").style.display = "block";
  document.querySelector("#notification").textContent = _text;
}

// hides the notification
function notificationOff() {
  document.querySelector(".alert").style.display = "none";
  document.querySelector(".alert").classList.remove("alert-green");
  document.querySelector(".alert").classList.add("alert-light");
}

// event listner works on load
window.addEventListener("load", async () => {
  notification("⌛ Loading...");
  await connectCeloWallet();
  await getBalance();
  await getProducts();
  notificationOff();
});

// Add new product button
document
  .querySelector("#newProductBtn")
  .addEventListener("click", async (e) => {
    // gets all the input given in the form and stores it in params
    const params = [
      document.getElementById("newProductName").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newProductDescription").value,
      document.getElementById("newLocation").value,
      document.getElementById("inputGroupSelect01").value,
      new BigNumber(document.getElementById("newPrice").value)
        .shiftedBy(ERC20_DECIMALS)
        .toString(),
      document.getElementById("items").value,
    ];

    notification(`⌛ Adding "${params[0]}"...`);
    try {
      //Calls the writeProduct method on the contract with the params as parameter
      const result = await contract.methods
        .writeProduct(...params)
        .send({ from: kit.defaultAccount });
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    notification(`🎉 You successfully added "${params[0]}".`, "sucess");
    getProducts();
  });

// implements buying functionality
document.querySelector("#marketplace").addEventListener("click", async (e) => {
  if (e.target.className.includes("buyBtn")) {
    const index = e.target.id;
    notification("⌛ Waiting for payment approval...");
    try {
      await approve(products[index].price);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
    notification(`⌛ Awaiting payment for "${products[index].name}"...`);
    try {
      const result = await contract.methods
        .buyProduct(index)
        .send({ from: kit.defaultAccount });
      notification(`🎉 You successfully bought "${products[index].name}".`);
      getProducts();
      getBalance();
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  }
});

//rerenders all the products
document.querySelector("#heading").addEventListener("click", async () => {
  notification("⌛ Loading...");
  await getProducts();
  notificationOff();
});

// checks and updates the balance of wallet
document.querySelector("#Balance").addEventListener("click", async () => {
  notification("⌛ Loading...");
  await getBalance();
  notificationOff();
});
