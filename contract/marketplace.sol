// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract Marketplace {
    //Keeps track of number of products created
    uint256 internal productsLength = 0;

    //Address for the token contract
    address internal cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    // Status of the product
    enum Status {
        Unavailable,
        Available
    }

    //Product struct storing attributes for Product
    struct Product {
        address payable owner;
        string name;
        string image;
        string description;
        string location;
        string category;
        uint256 price;
        uint256 sold;
        uint256 numberItems;
        Status status;
    }

    // mapping uint (ids) to Product(struct)
    mapping(uint256 => Product) internal products;

    //mapping address(users) to uint[] (list of products) for Wishlist
    mapping(address => uint256[]) internal Wishlist;

    //mapping products _index to reviews
    mapping(uint256 => string[]) internal reviews;

    //onlyOwner modifier
    modifier onlyOwner(uint256 _index) {
        require(
            products[_index].owner == msg.sender,
            "Checks for owner of the product"
        );
        _;
    }

    //verify product not deleted
    modifier notDeleted(uint256 _index) {
        require(
            products[_index].owner !=
                0x0000000000000000000000000000000000000000,
            "No product on this index"
        );
        _;
    }

    // sets the Proudct
    function writeProduct(
        //Parmeters passed
        string memory _name,
        string memory _image,
        string memory _description,
        string memory _location,
        string memory _category,
        uint256 _price,
        uint256 _numberItems
    ) public {
        // 0 items sold initially
        uint256 _sold = 0;
        require(
            _numberItems >= 1,
            "There should be at least 1 product available"
        );

        //initializing products mapping for _index by calling Product Constructor
        products[productsLength] = Product(
            payable(msg.sender),
            _name,
            _image,
            _description,
            _location,
            _category,
            _price,
            _sold,
            _numberItems,
            Status.Available
        );

        productsLength++;
    }

    // Returns all the product attributes for Proudct with provided _index
    function readProduct(uint256 _index) public view returns (Product memory) {
        return products[_index];
    }

    //buy product
    function buyProduct(uint256 _index) public payable notDeleted(_index) {
        //checks if items available
        require(
            products[_index].numberItems >= 1,
            "If the items a avaiable or not!"
        );
        //transfers tokens for sender to products owner
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                products[_index].owner,
                products[_index].price
            ),
            "Transfer failed."
        );
        //increase the sold count for a product
        products[_index].sold++;
        //decrease the number_items for a product
        products[_index].numberItems--;
        if (products[_index].numberItems == 0) {
            products[_index].status = Status.Unavailable;
        }
    }

    //Returns the count of products created
    function getProductsLength() public view returns (uint256) {
        return (productsLength);
    }

    //Adds the product with the provided index to the Wishlist
    function addToWishlist(uint256 _index) public notDeleted(_index) {
        // Checks if the product with the index exists
        require(
            _index < productsLength,
            "There is no product with this _index"
        );
        Wishlist[msg.sender].push(_index);
    }

    //Returns the list of products in callers Wishlist
    function getWishlist() public view returns (uint256[] memory) {
        return Wishlist[msg.sender];
    }

    // Delete Item from the Wishlist
    function deleteFromWishlist(uint256 _item) public {
        // Loops through the array on Wishlist mapping for msg.sender
        for (uint256 i = 0; i < Wishlist[msg.sender].length; i++) {
            // if it has item then delete it
            if (Wishlist[msg.sender][i] == _item) {
                delete Wishlist[msg.sender][i];
            }
        }
    }

    //Adds to the numberItems  in product
    function addItems(uint256 _index, uint256 _numberItems)
        public
        notDeleted(_index)
        onlyOwner(_index)
    {
        require(_numberItems >= 1, "Should add atleast one item");
        products[_index].numberItems += _numberItems;
        products[_index].status = Status.Available;
    }

    // Deletes the product with index
    function Delete(uint256 _index) public onlyOwner(_index) {
        delete products[_index];
        delete reviews[_index];
    }

    //Adds the review
    function addReview(uint256 _index, string memory _review)
        public
        notDeleted(_index)
    {
        reviews[_index].push(_review);
    }

    // Returns all the reviews for a product with the _index
    function getReview(uint256 _index)
        public
        view
        notDeleted(_index)
        returns (string[] memory)
    {
        return reviews[_index];
    }
}
