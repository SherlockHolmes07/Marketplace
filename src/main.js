import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import marketplaceAbi from "../contract/marketplace.abi.json";
import erc20Abi from "../contract/erc20.abi.json";

const ERC20_DECIMALS = 18;
const MPContractAddress = "0xd6E7Bde563594153Bd846C7005061d7b253DD984"; //Marketplace Contract Address
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

let Cat = "All"; // default category
let kit; //contractkit
let contract; //contract variable
let products = []; // array of products
let Wishlist = []; // products added to the wishlist

//Connects the wallet gets the account and initializes the contract
const connectCeloWallet = async function () {
	//Checks for the wallted
	if (window.celo) {
		// if the wallet is available it gets the account
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
			contract = new kit.web3.eth.Contract(
				marketplaceAbi,
				MPContractAddress
			);
		} catch (error) {
			notification(`⚠️ ${error}.`);
		}
	} else {
		// if the wallet is not available it shows a message
		notification("⚠️ Please install the CeloExtensionWallet.");
	}
};

// Calls for the approval of the transcation
async function approve(_price) {
	const cUSDContract = new kit.web3.eth.Contract(
		erc20Abi,
		cUSDContractAddress
	);
	const result = await cUSDContract.methods
		.approve(MPContractAddress, _price)
		.send({ from: kit.defaultAccount });
	return result;
}

// gets the balance of the connected account
const getBalance = async function () {
	const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
	// gets the balance in cUSD
	const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
	document.querySelector("#balance").textContent = cUSDBalance;
};

// gets all the products
const getProducts = async function (status, cat = "") {
	// calls the getProductsLength function on SmartContract
	const _productsLength = await contract.methods.getProductsLength().call();
	const _products = [];
	//  loops through all the products
	for (let i = 1; i < _productsLength; i++) {
		let _product = new Promise(async (resolve, reject) => {
			// calls the readProduct function on SmartContract
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
		// checks if the product has been deleted
		if (_product.owner == "0x0000000000000000000000000000000000000000") {
			continue;
		}
		_products.push(_product);
	}
	// waits for all the products to be fetched
	products = await Promise.all(_products);

	await getWishlist();
	renderProducts(status);
};

// gets the wishlist
const getWishlist = async () => {
	try {
		// calls the getWishlist function on SmartContract
		Wishlist = await contract.methods.getWishlist().call();
	} catch (e) {
		notification(`${e}`);
	}
};

// renders all the products in the products array
function renderProducts(status) {
	document.getElementById("marketplace").innerHTML = "";
	let _Products = products;
	console.log(status);

	// filters the products by status
	if (status !== "MyListings") {
		_Products = products.filter((p) => p.status == "1");
	} else {
		_Products = products.filter((p) => p.owner == kit.defaultAccount);
	}
	// filters the products by Wishlist
	if (status === "Wishlist") {
		_Products = _Products.filter((p) =>
			Wishlist.includes(p.index.toString())
		);
	}

	// filters the products by category
	if (Cat !== "All" && Cat !== undefined && Cat !== "") {
		_Products = _Products.filter((p) => p.category == Cat);
	}

	_Products.forEach((_product) => {
		const newDiv = document.createElement("div");
		newDiv.className = "col-md-4";
		newDiv.innerHTML = productTemplate(_product, status);
		document.getElementById("marketplace").appendChild(newDiv);
	});
}

//returns the template of the product
function productTemplate(_product, status) {
	let base = `
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
        <p class="card-text">
          <b>Category:</b> ${_product.category}        
        </p>
        <p class="card-text">
          <i class="bi bi-geo-alt-fill"></i>
          <span>${_product.location}</span>
        </p>
  `;

	// if the status is MyListings then it shows the add Items and delete buttons
	if (status === "MyListings") {
		base += `
     <p class="card-text">
     <b>Items Available:</b> ${_product.number_items}        
     </p>
     <div class="input-group mb-3">
     <input type="number" min="1" class="form-control" placeholder="Add Items" aria-label="Add Items" aria-describedby="basic-addon2" id="numberItems${_product.index}">
     <div class="input-group-append">
       <button class="btn btn-success addItems" id="${_product.index}" type="button">Add</button>
     </div>
   </div>
   `;
		base += `<div class="d-grid gap-2 mt-2"> <a class="btn btn-lg btn btn-danger deleteProduct" id="${_product.index}">Delete Product</a></div> </div> </div>`;
	}

	// if status is not MyListings then it will show the buy button and Wishlist Button
	else {
		if (kit.defaultAccount != _product.owner && _product.number_items > 0) {
			base += ` <div class="d-grid gap-2">
      <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3" id=${
			_product.index
		}>
        Buy for ${_product.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
      </a>
    </div>`;
		}

		let num = _product.index;
		// checks if the product is in the wishlist
		if (Wishlist.includes(num.toString())) {
			base += `<div class="d-grid gap-2 mt-2"> <a class="btn btn-lg btn btn-danger removeWish" id="${_product.index}">Remove from Wishlist</a></div>`;
		}
		// checks if the product is not in the wishlist
		else {
			base += `<div class="d-grid gap mt-2"> <a class="btn btn-lg btn btn-pink addWish" id="${_product.index}" 
      >Add to Wishlist</a></div>`;
		}

		// Add review button
		base += `<div class="d-grid gap mt-2"> <a class="btn btn-lg btn-dark Reviews" id="${_product.index}">Reviews</a></div>`;

		// Reviews section
		base += `
    <div id="comment-review${_product.index}" style="display: none;">
    <ul class="d-grid gap dibba mt-3 pt-2 pr-2 pl-2" id="review${_product.index}">
    </ul> 
    
    <div class="card-footer py-3 border-0 mt-3" style="background-color: #f8f9fa;">
            <div class="d-flex flex-start w-100">
              <div class="form-outline w-100">
                <textarea class="form-control" id="textAreaExample${_product.index}" rows="4"
                  style="background: #fff;"></textarea>
                <label class="form-label" for="textAreaExample">Comments</label>
              </div>
            </div>
            <div class="float-end mt-2 pt-1">
              <button type="button" class="btn btn-success Postcomment" id="${_product.index}">Post comment</button>
            </div>
      </div>


    </div>`;

		base += `</div> </div>`;
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
	if (type === "success") {
		//success
		document.querySelector(".alert").classList.remove("alert-light");
		document.querySelector(".alert").classList.remove("alert-danger");
		document.querySelector(".alert").classList.add("alert-green");
	} else if (type === "error") {
		//error
		document.querySelector(".alert").classList.remove("alert-light");
		document.querySelector(".alert").classList.remove("alert-green");
		document.querySelector(".alert").classList.add("alert-danger");
	} else {
		//default
		document.querySelector(".alert").classList.remove("alert-green");
		document.querySelector(".alert").classList.remove("alert-danger");
		document.querySelector(".alert").classList.add("alert-light");
	}
	//show notification
	document.querySelector(".alert").style.display = "block";
	document.querySelector("#notification").textContent = _text;
}

// hides the notification
function notificationOff() {
	document.querySelector(".alert").style.display = "none";
}

// event listner works on load
window.addEventListener("load", async () => {
	notification("⌛ Loading...");
	await connectCeloWallet();
	await getBalance();
	await getProducts("all");
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

		// checks if all the fields are filled
		if (params.includes("") || params.includes(NaN)) {
			notification("Please fill all the fields", "error");
			return;
		}

		notification(`⌛ Adding "${params[0]}"...`);
		try {
			//Calls the writeProduct method on the contract with the params as parameter
			const result = await contract.methods
				.writeProduct(...params)
				.send({ from: kit.defaultAccount });
		} catch (error) {
			// if the transaction fails
			notification(`⚠️ ${error}.`, "error");
		}
		// if the transcation is successful
		notification(`🎉 You successfully added "${params[0]}".`, "success");
		// reloads the page
		getProducts();
	});

// implements various functionalities
document.querySelector("#marketplace").addEventListener("click", async (e) => {
	// checks if the button clicked is buy button
	if (e.target.className.includes("buyBtn")) {
		const index = e.target.id;
		// console.log(index);
		console.log(products[index - 1]);

		if (
			products[index - 1].status === "0" ||
			products[index - 1].number_items <= "0"
		) {
			notification("This item is sold out", "error");
			return;
		}

		notification("⌛ Waiting for payment approval...");

		// Calls the approve method
		try {
			await approve(products[index - 1].price);
		} catch (error) {
			notification(`⚠️ ${error}.`, "error");
		}

		notification(
			`⌛ Awaiting payment for "${products[index - 1].name}"...`
		);

		// calls the buyProduct method on the contract with the index of the product as parameter
		try {
			const result = await contract.methods
				.buyProduct(index)
				.send({ from: kit.defaultAccount });
			notification(
				`🎉 You successfully bought "${products[index - 1].name}".`,
				"success"
			);
			getProducts("all");
			getBalance();
		} catch (error) {
			notification(`⚠️ ${error}.`, "error");
		}
	}
	// checks if the button clicked is add to wishlist button
	else if (e.target.className.includes("addWish")) {
		const index = e.target.id;
		console.log(index);
		notification("⌛ Adding to Wishlist...");

		// calls the addToWishlist method on the contract with the index of the product as parameter
		try {
			const result = await contract.methods
				.addToWishlist(index)
				.send({ from: kit.defaultAccount });

			notification(
				`🎉 You successfully added product to wishlist.`,
				"success"
			);
			//Wishlist.push(index);
			getProducts("all");
			//getBalance();
		} catch (error) {
			// if the transaction fails
			console.log(error);
			notification(`⚠️ ${error}.`, "error");
		}
	}
	// checks if the button clicked is remove from wishlist button
	else if (e.target.className.includes("removeWish")) {
		const index = e.target.id;
		console.log(index);
		notification("⌛ Removing from Wishlist...");

		// calls the deleteFromWishlist method on the contract with the index of the product as parameter
		try {
			const result = await contract.methods
				.deleteFromWishlist(index)
				.send({ from: kit.defaultAccount });
			notification(
				`🎉 You successfully removed product from wishlist.`,
				"success"
			);
			getProducts("all");
		} catch (error) {
			// if the transcation fails
			console.log(error);
			notification(`⚠️ ${error}.`, "error");
		}
	}
	// checks if the button clicked is Delete Product button
	else if (e.target.className.includes("deleteProduct")) {
		const index = e.target.id;
		console.log(index);
		notification("⌛ Deleting Product...");

		// calls the deleteProduct method on the contract with the index of the product as parameter
		try {
			const result = await contract.methods
				.Delete(index)
				.send({ from: kit.defaultAccount });
			notification(`🎉 You successfully deleted product.`, "success");
			getProducts("MyListings");
		} catch (error) {
			// if the transcation fails
			console.log(error);
			notification(`⚠️ ${error}.`, "error");
		}
	}
	// checks if the button clicked is Add Items button
	else if (e.target.className.includes("addItems")) {
		const index = e.target.id;
		const items = document.getElementById(`numberItems${index}`).value;
		console.log(index, items);
		notification("⌛ Adding Items...");

		// calls the addItems method on the contract with the index of the product as parameter
		try {
			const result = await contract.methods
				.addItems(index, items)
				.send({ from: kit.defaultAccount });
			notification(`🎉 You successfully added items.`, "success");
			getProducts("MyListings");
		} catch (error) {
			// if the transcation fails
			console.log(error);
			notification(`⚠️ ${error}.`, "error");
		}
	}

	// checks if the button clicked id Reviews button
	else if (e.target.className.includes("Reviews")) {
		const index = e.target.id;
		const vis = document.getElementById(`comment-review${index}`).style
			.display;

		// checks if the review section is visible or not
		if (vis === "none") {
			// loading notification
			// notification("⌛ Loading Reviews...");
			let Comments;
			// calls the getReview method on the contract with the index of the product as parameter
			try {
				Comments = await contract.methods.getReview(index).call();
				console.log(Comments);

				// if there are no reviews
				if (Comments.length === 0) {
					document.getElementById(`review${index}`).innerHTML =
						"No reviews yet";
				} else {
					document.getElementById(`review${index}`).innerHTML = "";
				}

				// loops through the comments and appends them to the review section
				Comments.forEach((comment) => {
					document.getElementById(
						`review${index}`
					).innerHTML += `<li class=" p-2 comment mt-1"> ${comment} </li>`;
				});
				//  notificationOff();
				document.getElementById(
					`comment-review${index}`
				).style.display = "block";
			} catch (error) {
				console.log(error);
				notification(`⚠️ ${error}.`, "error");
			}
		}
		// if the review section is visible
		else {
			document.getElementById(`comment-review${index}`).style.display =
				"none";
			notificationOff();
		}
	}

	// checks if the button clicked is post Comment button
	else if (e.target.className.includes("Postcomment")) {
		const index = e.target.id;
		const comment = document.getElementById(
			`textAreaExample${index}`
		).value;
		// checks if the comment is empty
		if (comment === "") {
			notification("⚠️ You have entered an empty Comment.", "error");
			return;
		}

		console.log(index, comment);
		notification("⌛ Posting Comment...");

		// calls the postReview method on the contract with the index of the product as parameter
		try {
			const result = await contract.methods
				.addReview(index, comment)
				.send({ from: kit.defaultAccount });
			notification(`🎉 You successfully posted your review.`, "success");
			document.getElementById(
				`review${index}`
			).innerHTML += `<li class=" p-2 comment mt-1"> ${comment} </li>`;
			document.getElementById(`textAreaExample${index}`).value = "";
		} catch (error) {
			// if the transcation fails
			console.log(error);
			notification(`⚠️ ${error}.`, "error");
		}
	}
});

//rerenders all the products
document.querySelector("#heading").addEventListener("click", async () => {
	notification("⌛ Loading...");
	Cat = "All";
	await getProducts("all");
	document.querySelector("select#DropDown").style.display = "block";
	document.querySelector("select#DropDown").value = "";
	notificationOff();
	console.log(Wishlist);
});

// checks and updates the balance of wallet
document.querySelector("#Balance").addEventListener("click", async () => {
	notification("⌛ Loading...");
	await getBalance();
	notificationOff();
});

// renders the wishlist
document.querySelector("#WishlistB").addEventListener("click", async () => {
	notification("⌛ Loading...");
	Cat = "All";
	await getProducts("Wishlist");
	document.querySelector("select#DropDown").style.display = "none";
	notificationOff();
});

// renders the products added by the user
document.querySelector("#MyListings").addEventListener("click", async () => {
	notification("⌛ Loading...");
	Cat = "All";
	await getProducts("MyListings");
	document.querySelector("select#DropDown").style.display = "none";
	notificationOff();
});

// renders the products as per the category selected
document.querySelector("#DropDown").addEventListener("click", async (e) => {
	Cat = e.target.value;
	await getProducts("all");
});
