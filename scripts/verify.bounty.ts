import hre, { ethers } from "hardhat";

async function main() {
  // ------------------- //
  // ----- EXAMPLE ----- //
  // ------------------- //

  try {
    await hre.run("verify:verify", {
      // https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html#using-programmatically
      address: "0x7Bdf9F6fB31430728Eb15f073Bb8f84B1ADD0e4C",
      constructorArguments: [], // empty for all facets except main Diamond contract deployed initially
      contract: "contracts/bounty_diamond/facets/core/Automate.sol:Automate", // contractPath:contractName
    });
  } catch (err) {
    console.log(err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// npx hardhat run ./scripts/verify.bounty.ts --network mumbai
// NOTE: if have trouble verifying with some weird file not found error, delete `artifacts`/`cache` and try again
