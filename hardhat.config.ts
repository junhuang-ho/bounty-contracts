import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// require("hardhat-deploy");
import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

interface CustomConfig extends HardhatUserConfig {
  namedAccounts: any;
}

const config: CustomConfig = {
  solidity: {
    compilers: [
      { version: "0.8.18" },
      //   { version: "0.5.11" },
      //   { version: "0.4.24" }, // for mocks
      // { version: "0.4.16" },
      //   { version: "0.6.6" }, // for mocks
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_API_URL_MUMBAI!,
        blockNumber: 32731400,
      },
    },
    polygon: {
      chainId: 137,
      url: process.env.ALCHEMY_API_URL_POLYGON!,
      accounts: [process.env.PRIVATE_KEY_1!],
      //   blockGasLimit: 3000000,
      //   gasPrice: 100000000000, // 100 gwei
    },
    mumbai: {
      chainId: 80001,
      url: process.env.ALCHEMY_API_URL_MUMBAI!,
      accounts: [process.env.PRIVATE_KEY_1!, process.env.PRIVATE_KEY_2!],
      //   blockGasLimit: 2200000,
    },
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY!,
  },
  namedAccounts: {
    deployer: {
      default: 0,
      mmumbai: 0,
    },
  },
};

export default config;
