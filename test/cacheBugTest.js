// const { ethers } = require("hardhat");

// const { testDeployParams, contractDeploy } = require("../../../scripts/main");
// const {
//   getSelectors,
//   FacetCutAction,
// } = require("../../../scripts/utilsDiamond");

// const { assert } = require("chai");

// // The diamond example comes with 8 function selectors
// // [cut, ctLoupe, ctLoupe, ctLoupe, ctLoupe, erc165, transferOwnership, owner]
// // This bug manifests if you delete something from the final
// // selector slot array, so we'll fill up a new slot with
// // things, and have a fresh row to work with.
// describe("Cache bug test", async () => {
//   let ctLoupe;
//   let test1Facet;
//   const acSel0 = "0x52a9c8d7";

//   const sel0 = "0x19e3b533"; // fills up slot 1
//   const sel1 = "0x0716c2ae"; // fills up slot 1
//   const sel2 = "0x11046047"; // fills up slot 1
//   const sel3 = "0xcf3bbe18"; // fills up slot 1
//   const sel4 = "0x24c1d5a7"; // fills up slot 1
//   const sel5 = "0xcbb835f6"; // fills up slot 1
//   const sel6 = "0xcbb835f7"; // fills up slot 1
//   const sel7 = "0xcbb835f8"; // fills up slot 2
//   const sel8 = "0xcbb835f9"; // fills up slot 2
//   const sel9 = "0xcbb835fa"; // fills up slot 2
//   const sel10 = "0xcbb835fb"; // fills up slot 2

//   before(async function () {
//     let tx;
//     let receipt;

//     let selectors = [
//       sel0,
//       sel1,
//       sel2,
//       sel3,
//       sel4,
//       sel5,
//       sel6,
//       sel7,
//       sel8,
//       sel9,
//       sel10,
//     ];

//     const {
//       diamondCutCtName,
//       diamondCtName,
//       facetNames,
//       facetInitsCtName,
//       minContractGelatoBalance,
//       addressesSuperTokens,
//     } = await testDeployParams();
//     [diamondAddress, _] = await contractDeploy(
//       diamondCutCtName,
//       diamondCtName,
//       facetNames,
//       facetInitsCtName,
//       minContractGelatoBalance,
//       addressesSuperTokens
//     );
//     let ctCut = await ethers.getContractAt("Cut", diamondAddress);
//     ctLoupe = await ethers.getContractAt("Loupe", diamondAddress);
//     const Test1Facet = await ethers.getContractFactory("Test1Facet");
//     test1Facet = await Test1Facet.deploy();
//     await test1Facet.deployed();

//     // add functions
//     tx = await ctCut.diamondCut(
//       [
//         {
//           facetAddress: test1Facet.address,
//           action: FacetCutAction.Add,
//           functionSelectors: selectors,
//         },
//       ],
//       ethers.constants.AddressZero,
//       "0x"
//       //   { gasLimit: 800000 }
//     );
//     receipt = await tx.wait();
//     if (!receipt.status) {
//       throw Error(`Diamond upgrade failed: ${tx.hash}`);
//     }

//     // Remove function selectors
//     // Function selector for the owner function in slot 0
//     selectors = [
//       acSel0, // owner selector
//       sel5,
//       sel10,
//     ];
//     tx = await ctCut.diamondCut(
//       [
//         {
//           facetAddress: ethers.constants.AddressZero,
//           action: FacetCutAction.Remove,
//           functionSelectors: selectors,
//         },
//       ],
//       ethers.constants.AddressZero,
//       "0x",
//       { gasLimit: 800000 }
//     );
//     receipt = await tx.wait();
//     if (!receipt.status) {
//       throw Error(`Diamond upgrade failed: ${tx.hash}`);
//     }
//   });

//   describe("diamond cut", function () {
//     it("should not exhibit the cache bug", async () => {
//       // Get the test1Facet's registered functions
//       let selectors = await ctLoupe.facetFunctionSelectors(test1Facet.address);

//       // Check individual correctness
//       assert.isTrue(selectors.includes(sel0), "Does not contain sel0");
//       assert.isTrue(selectors.includes(sel1), "Does not contain sel1");
//       assert.isTrue(selectors.includes(sel2), "Does not contain sel2");
//       assert.isTrue(selectors.includes(sel3), "Does not contain sel3");
//       assert.isTrue(selectors.includes(sel4), "Does not contain sel4");
//       assert.isTrue(selectors.includes(sel6), "Does not contain sel6");
//       assert.isTrue(selectors.includes(sel7), "Does not contain sel7");
//       assert.isTrue(selectors.includes(sel8), "Does not contain sel8");
//       assert.isTrue(selectors.includes(sel9), "Does not contain sel9");

//       assert.isFalse(selectors.includes(acSel0), "Contains acSel0");
//       assert.isFalse(selectors.includes(sel10), "Contains sel10");
//       assert.isFalse(selectors.includes(sel5), "Contains sel5");
//     });
//   });
// });
