

const {expect} = require("chai");
const AaveMarket = require("../../utils/aave");
let nodeProvider = require("../../utils/ganache.provider");
let web3 = nodeProvider.getWeb3();
let aaveMarket = new  AaveMarket(web3);



let users=[],BN=web3.utils.BN
describe("Aave Liquidation", function () {
    let alice, bob, liquid;
    before(async () => {


        this.DAI = await nodeProvider.getAave("MockDAI");
        this.USDC = await nodeProvider.getAave("MockUSDC");
        let provider = await nodeProvider.getAave("LendingPoolAddressesProvider"); //?

        let lpAddr = await provider.getLendingPool()
        this.lpContract = await nodeProvider.getAave("LendingPool", lpAddr);

        this.lpCore = await provider.getLendingPoolCore()
        this.lpCoreContract = await nodeProvider.getAave("LendingPoolCore", this.lpCore);

        this.lpDataPrivider = await provider.getLendingPoolDataProvider();
        this.lpDataPrividerContract = await nodeProvider.getAave("LendingPoolDataProvider", this.lpDataPrivider );

        this.lpAddressProvider = provider

        let _aDaiAddr = await this.lpCoreContract.getReserveATokenAddress(this.DAI.address)
        this.aDAI = await nodeProvider.getMint("AToken", _aDaiAddr);

        this.priceOracle = await nodeProvider.getMint("PriceOracle")


        users = nodeProvider.getAccounts();
        [alice, bob, liquid] = users;
    });

    it('Liquidation', async () => {
        this.timeout(500000);
        let _reserve = this.USDC.address;
        let _user= alice;
        console.log(this.lpDataPrividerContract.address)
        let foo = await this.lpDataPrividerContract.calculateUserGlobalData(alice);

         aaveMarket.calculateUserGlobalData(alice,foo,"300");

        let _collateral = this.DAI.address;
        let userCollateralBalance = await this.lpCoreContract.getUserUnderlyingAssetBalance(_collateral, alice);
        let isReserveUsageAsCollateralEnabled = await  this.lpCoreContract.isReserveUsageAsCollateralEnabled(_collateral)
        let isUserUseReserveAsCollateralEnabled = await this.lpCoreContract.isUserUseReserveAsCollateralEnabled(_collateral, alice);

        // eth 有这个问题 可能
        let originationFee =  await this.lpCoreContract.getUserOriginationFee(_reserve, _user);

        console.log("originationFee",originationFee.toString())

        console.log(userCollateralBalance.div(new BN(10).pow(new BN(18))).toString(),
            isReserveUsageAsCollateralEnabled,
            isUserUseReserveAsCollateralEnabled)

        let userBorrowBalances = await this.lpCoreContract.getUserBorrowBalances(_reserve, bob);
        let userCompoundedBorrowBalance =  userBorrowBalances[1];
        let borrowBalanceIncrease = userBorrowBalances[2];

        // maxPrincipalAmountToLiquidate
        let _actualAmountToLiquidate =  userCompoundedBorrowBalance.mul(new BN(50)).div(new BN(100));
        console.debug(_actualAmountToLiquidate.toString(), borrowBalanceIncrease.toString());

        // _purchaseAmount > vars.maxPrincipalAmountToLiquidate
        //     ? vars.maxPrincipalAmountToLiquidate
        //     : _purchaseAmount;



        let core = this.lpCoreContract;
        let oracle = this.priceOracle
        async function calculateAvailableCollateralToLiquidate( _collateral,
                                                                _principal,
                                                                _purchaseAmount,
                                                                _userCollateralBalance) {

           let collateralAmount = 0;
            let principalAmountNeeded = 0;


            let bonus =   await core.getReserveLiquidationBonus(_principal);
            console.log(bonus.toString())
            let collateralPrice = await oracle.getAssetPrice(_collateral);

            await oracle.setAssetPrice(_principal,collateralPrice);
            let principalCurrencyPrice = await oracle.getAssetPrice(_principal);


            console.log(collateralPrice.toString(),principalCurrencyPrice.toString())

            let maxAmountCollateralToLiquidate = principalCurrencyPrice
                .mul(_purchaseAmount)
                .div(collateralPrice)
                .mul(bonus)
                .div(new BN(100));

            if (maxAmountCollateralToLiquidate > _userCollateralBalance) {
                collateralAmount = _userCollateralBalance;
                principalAmountNeeded =  collateralPrice
                    .mul(collateralAmount)
                    .div(vars.principalCurrencyPrice)
                    .mul(100)
                    .div(vars.liquidationBonus);
            }else {
                collateralAmount =  maxAmountCollateralToLiquidate;
                principalAmountNeeded = _purchaseAmount;
            }



            console.log("collateralAmount",collateralAmount.toString());

            console.log("principalAmountNeeded",principalAmountNeeded.toString());

            return (collateralAmount, principalAmountNeeded);


        }

        calculateAvailableCollateralToLiquidate(
            _collateral,
            _reserve,
            _actualAmountToLiquidate,
            userCollateralBalance
        );
        // (uint256 maxCollateralToLiquidate, uint256 principalAmountNeeded) =

    }).timeout(50000);

})
