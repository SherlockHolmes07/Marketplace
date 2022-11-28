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
    mapping(uint256 => Product) private products;

    //mapping address(users) to uint[] (list of products) for Wishlist
    mapping(address => uint256[]) private Wishlist;

    //mapping products _index to reviews
    mapping(uint256 => string[]) private reviews;

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
                address(0),
            "No product on this index"
        );
        _;
    }

    /// @dev allow sellers to create and  sets a Product they want to sell
    /// @notice Input data needs to contain only valid and non-empty values
    function writeProduct(
        string calldata _name,
        string calldata _image,
        string calldata _description,
        string calldata _location,
        string memory _category,
        uint256 _price,
        uint256 _numberItems
    ) public {
        require(bytes(_name).length > 0,"Empty name");
        require(bytes(_image).length > 0,"Empty image");
        require(bytes(_description).length > 0,"Empty description");
        require(bytes(_location).length > 0,"Empty location");
        require(bytes(_category).length > 0,"Empty category");
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

    // Return all the product attributes for Proudct with provided _index
    function readProduct(uint256 _index) public view returns (Product memory) {
        return products[_index];
    }

    /// @dev allow users to buy products available on the platform
    function buyProduct(uint256 _index) public payable notDeleted(_index) {
        Product storage currentProduct = products[_index];
        //checks if items available
        require(
            currentProduct.numberItems >= 1,
            "If the items a avaiable or not!"
        );
        require(currentProduct.owner != msg.sender, "You are not allowed to buy your products");
        //transfers tokens for sender to products owner
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                currentProduct.owner,
                currentProduct.price
            ),
            "Transfer failed."
        );
        //increases the sold count for a product
        currentProduct.sold++;
        //decreases the number_items for a product
        currentProduct.numberItems--;
        if (currentProduct.numberItems == 0) {
            currentProduct.status = Status.Unavailable;
        }
    }

    //Returns the count of products created
    function getProductsLength() public view returns (uint256) {
        return (productsLength);
    }

    /// @dev Adds the product with the provided index to the Wishlist
    function addToWishlist(uint256 _index) public notDeleted(_index) {
        Wishlist[msg.sender].push(_index);
    }

    // Returns the list of products in caller's wishlist
    function getWishlist() public view returns (uint256[] memory) {
        return Wishlist[msg.sender];
    }

    // Deletes an item/product from the Wishlist of the caller
    function deleteFromWishlist(uint256 _item) public {
        uint wishlistLength = Wishlist[msg.sender].length;
        // Loops through the array on wishlist mapping for msg.sender
        for (uint256 i = 0; i < wishlistLength; i++) {
            // if it has item then delete it
            if (Wishlist[msg.sender][i] == _item) {
                delete Wishlist[msg.sender][i];
            }
        }
    }

    /// @dev allow products' owners to increase the numberItems of their product
    function addItems(uint256 _index, uint256 _numberItems)
        public
        notDeleted(_index)
        onlyOwner(_index)
    {
        require(_numberItems >= 1, "Should add atleast one item");
        products[_index].numberItems += _numberItems;
        products[_index].status = Status.Available;
    }

    /// @dev allow the product's owner to delete the product with index
    function Delete(uint256 _index) public onlyOwner(_index) {
        delete products[_index];
        delete reviews[_index];
    }

    /// @dev allow a user to review a product
    function addReview(uint256 _index, string calldata _review)
        public
        notDeleted(_index)
    {
        require(bytes(_review).length > 0, "Review message can't be empty");
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
