# setup

yarn add --dev hardhat
npx hardhat
---copy this to new repo's README.md
---copy contents of `hardhat.config.ts` if needed
touch .env
---copy contents of .env
add `"resolveJsonModule": true` in tsconfig.json
yarn add --dev dotenv @openzeppelin/contracts @superfluid-finance/ethereum-contracts

[deprecated?] yarn add --dev hardhat-deploy
[deprecated?] yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers [this command is to override hardhat-ethers to use hardhat-deploy-ethers - check package.json]

### Diamond Contract Pattern

1. Diamond-3: https://github.com/mudgen/diamond-3-hardhat
2. Diamond Storage (data storage ONLY lives in Diamond Proxy Contract):
   ref | https://eip2535diamonds.substack.com/p/how-storage-works-in-eip2535-diamonds
   ref | https://eip2535diamonds.substack.com/p/keep-your-data-right-in-eip2535-diamonds?utm_source=substack&utm_campaign=post_embed&utm_medium=web
   ref | https://dev.to/mudgen/how-diamond-storage-works-90e

3. best practice: DON'T store any user data in Diamond !!!! eg data that cannot be overriden or may require complex migrations
4. best practice: use new storage position with new struct when defining new data storage variables in Diamond !!! eg define it in new Lib

# Workflow

- npx hardhat test | test all with forked testnet
- npx hardhat test "./path/to/specific/test_Script" | test specific
- see scripts folder and fn/command used for deployment

# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```
