export const CONTRACT_PARENT_FOLDER = "livethree-contracts";
export const ZERO_BYTES = "0x";

export const ADDR_GEL_OPS_PROXY_FACTORY =
  "0xC815dB16D4be6ddf2685C201937905aBf338F5D7";
export const ADDR_GEL_FEE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const networkConfig = {
  default: {
    name: "hardhat",
  },
  31337: {
    name: "localhost",
    addrUSDC: "0xbe49ac1EadAc65dccf204D4Df81d650B50122aB2",
    addrUSDCx: "0x42bb40bF79730451B11f6De1CbA222F17b87Afd7", // using mumbai data
    addrDAIx: "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f", // using mumbai data
    addrSFHost: "0xEB796bdb90fFA0f28255275e16936D25d3418603", // using mumbai data
    addrCFAV1: "0x49e565Ed1bdc17F3d220f72DF0857C26FA83F873", // using mumbai data
    addrGelNet: "0x25aD59adbe00C2d80c86d01e2E05e1294DA84823", // using mumbai data
    addrGelAutobot: "0xB3f5503f93d5Ef84b06993a1975B9D21B962892F", // using mumbai data
    addrGelTreasury: "0x527a819db1eb0e34426297b03bae11F2f8B3A19E", // using mumbai data
  },
  1: {
    name: "mainnet",
  },
  5: {
    name: "goerli",
  },
  137: {
    name: "polygon",
    addrUSDC: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    addrUSDCx: "0xCAa7349CEA390F89641fe306D93591f87595dc1F",
    addrDAIx: "0x1305F6B6Df9Dc47159D12Eb7aC2804d4A33173c2",
    addrSFHost: "0x3E14dC1b13c488a8d5D310918780c983bD5982E7",
    addrCFAV1: "0x6EeE6060f715257b970700bc2656De21dEdF074C",
    addrGelNet: "0x7598e84B2E114AB62CAB288CE5f7d5f6bad35BbA",
    addrGelAutobot: "0x527a819db1eb0e34426297b03bae11F2f8B3A19E",
    addrGelTreasury: "0x32DC6700AC87f6300277a63b0A4fDf132A8392bd",
  },
  80001: {
    name: "mumbai",
    addrUSDC: "0xbe49ac1EadAc65dccf204D4Df81d650B50122aB2",
    addrUSDCx: "0x42bb40bF79730451B11f6De1CbA222F17b87Afd7",
    addrDAIx: "0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f",
    addrSFHost: "0xEB796bdb90fFA0f28255275e16936D25d3418603",
    addrCFAV1: "0x49e565Ed1bdc17F3d220f72DF0857C26FA83F873",
    addrGelNet: "0x25aD59adbe00C2d80c86d01e2E05e1294DA84823",
    addrGelAutobot: "0xB3f5503f93d5Ef84b06993a1975B9D21B962892F",
    addrGelTreasury: "0x527a819db1eb0e34426297b03bae11F2f8B3A19E",
  },
} as any;

module.exports = {
  CONTRACT_PARENT_FOLDER,
  //   CURRENT_DEPLOYED_FOLDER,
  //   CURRENT_DEPLOYED_FOLDER_DIR,
  ADDR_GEL_OPS_PROXY_FACTORY,
  ADDR_GEL_FEE,
  ZERO_BYTES,
  networkConfig,
};
