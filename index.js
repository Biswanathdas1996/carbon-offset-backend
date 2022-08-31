require("dotenv").config();

const express = require("express");
const app = require("express")();
const cors = require("cors");
const shortid = require("shortid");

var Web3 = require("web3");

var ABI = require("./ABI.json");
var ADDRESS = require("./Address.json");

var InfuraNodeURL = `https://rinkeby.infura.io/v3/24022fda545f41beb59334bdbaf3ef32`;
var WalletPrivateKey =
  "33e8389993eea0488d813b34ee8d8d84f74f204c17b95896e9380afc6a514dc7";

const web3 = new Web3(new Web3.providers.HttpProvider(InfuraNodeURL));
const signer = web3.eth.accounts.privateKeyToAccount(WalletPrivateKey);
web3.eth.accounts.wallet.add(signer);
const contract = new web3.eth.Contract(ABI, ADDRESS);

app.use(cors());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.json());

app.get("/", async (req, res) => {
  // const amount = req?.query?.price;
  try {
    res.json({
      id: 1,
      currency: "INR",
      amount: "123",
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/get-all-token", async (req, res) => {
  try {
    const response = await contract.methods
      .getToken()
      .call({ from: signer.address });
    console.log(response);
    res.json(response);
  } catch (error) {
    console.log(error);
  }
});

const getAllListedToken = async (getAllToken) => {
  const mappedTokenData = [];
  for (let i = 0; i < getAllToken.length; i++) {
    const getTokenListingState = await contract.methods
      .getTokenListingState(Number(getAllToken[i]))
      .call({ from: signer.address });
    const mappedData = await { ...getAllToken[i], ...getTokenListingState };
    if (mappedData?.tokenState === "1") {
      mappedTokenData.push(mappedData);
    }
  }
  return mappedTokenData;
};

app.post("/transfer-token", async (req, res) => {
  if (!req.body) res.json("Please add body");
  const { product_quantity, wallet_address } = req.body;

  const getAllToken = await contract.methods
    .getToken()
    .call({ from: signer.address });

  const tokens = await getAllListedToken(getAllToken);
  const pickedToken = tokens.slice(0, product_quantity);
  let transction;
  for (let i = 0; i < pickedToken?.length; i++) {
    const ownerOfToken = await contract.methods
      .ownerOf(pickedToken[i].token)
      .call({ from: signer.address });

    transction = await contract.methods
      .doTransfer(ownerOfToken, wallet_address, pickedToken[i].token)
      .send({
        from: signer.address,
        gas: "4700000",
        value: 0,
      })
      .once("transactionHash", (txhash) => {
        console.log(`Mining transaction ...`);
        console.log(txhash);
      })
      .catch((error) => {
        const errorData = { error };
        res.json(errorData.error);
      });
  }
  res.json(transction);
});

app.post("/add-to-token", async (req, res) => {
  if (!req.body) res.json("Please add body");

  const tokenUID = req?.query?.id;
  if (!tokenUID) res.json("Token id missing");

  const response = await contract.methods
    .tokenURI(tokenUID)
    .call({ from: signer.address });
  const tokenData = response && JSON.parse(response);
  if (tokenData?.transction) {
    tokenData.transction.push(req.body);
  } else {
    const transaction = [req.body];
    tokenData.transction = transaction;
  }

  const tokenURI = JSON.stringify(tokenData);
  try {
    const response = await contract.methods
      .addData(tokenUID, tokenURI)
      .send({
        from: signer.address,
        // gas: await tx.estimateGas(),
        gas: "4700000",
        value: 0,
      })
      .once("transactionHash", (txhash) => {
        console.log(`Mining transaction ...`);
        console.log(txhash);
        res.json(txhash);
      })
      .catch((error) => {
        const errorData = { error };
        res.json(errorData.error);
      });
    res.json(response);
  } catch (error) {
    console.log(error);
  }
});

app.get("/get-token-data", async (req, res) => {
  const tokenId = req?.query?.id;
  try {
    const response = await contract.methods
      .tokenURI(tokenId)
      .call({ from: signer.address });
    const outputData = response && JSON.parse(response);
    res.json(outputData);
  } catch (error) {
    console.log(error);
  }
});

// app.use()

const PORT = process.env.PORT || 1337;

app.listen(PORT, () => {
  console.log("Backend running at localhost:1337");
});
