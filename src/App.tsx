import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import { Route, Routes, useParams } from 'react-router-dom';
import makeBlockie from 'ethereum-blockies-base64';
import axios from 'axios';
import { getAddress } from 'ethers/lib/utils';
import { ethers } from '@web3-onboard/common/node_modules/ethers';

interface ChainInfo {
  chainId: string
  chainName: string
  publicRpcUri: {
    value: string
  }
}

interface AccountInfo {
  address: string,
  chainName: string
}

const loadChainInfo = async (chainId: string): Promise<ChainInfo> => {
  const resp = await axios.get<ChainInfo>(`https://safe-client.gnosis.io/v1/chains/${chainId}`)
  if (resp.status !== 200 || !resp.data) throw Error("could not load chain info")
  return resp.data
}

const checkAddress = async(chainInfo: ChainInfo, address: string) => {
  const provider = new ethers.providers.JsonRpcBatchProvider(chainInfo.publicRpcUri.value)
  const code = await provider.getCode(address)
  if (code === "0x") throw Error("Account not available")
}

const loadAddressInfo = async (account: string): Promise<AccountInfo> => {
  const eip3770Parts = account.split(":")
  let chainInfo
  let address
  if (eip3770Parts.length === 1) {
    chainInfo = await loadChainInfo("1")
    if (eip3770Parts[0].startsWith("0x"))
      address = getAddress(eip3770Parts[0])
    else if (!!chainInfo.publicRpcUri.value) {
      const provider = new ethers.providers.JsonRpcBatchProvider(chainInfo.publicRpcUri.value)
      address = await provider.resolveName(eip3770Parts[0])
    }
  } else if (eip3770Parts.length === 2) {
    chainInfo = await loadChainInfo(eip3770Parts[0])
    address = getAddress(eip3770Parts[1])
  } else if (eip3770Parts.length === 3 && eip3770Parts[0] === "eip155") {
    chainInfo = await loadChainInfo(eip3770Parts[1])
    address = getAddress(eip3770Parts[2])
  } else throw Error("Invalid address format")
  if (!address) throw Error("Could not get address")
  await checkAddress(chainInfo, address)
  return {
    address,
    chainName: chainInfo.chainName
  }
}

function Address() {
  let { address } = useParams();
  const [errorMessage, setErrorMessage] = useState<undefined | string>()
  const [addressInfo, setAddressInfo] = useState<undefined | AccountInfo>()
  const getAddressInfo = useCallback(async (address: string) => {
    try {
      setAddressInfo(await loadAddressInfo(address))
    } catch (e: any) {
      console.log("Error", e)
      setErrorMessage(e.message || "An error occured!")
    }
  }, [setAddressInfo, setErrorMessage])
  useEffect(() => {
    setErrorMessage(undefined)
    if (address)
      getAddressInfo(address)
    else
      setErrorMessage("No address provided")
  }, [address, getAddressInfo, setErrorMessage])
  return (
    <header className="App-header">
      {addressInfo ? (<div>
        <img src={makeBlockie(addressInfo.address)} style={{
          width: 160,
          height: 160,
          borderRadius: 80
        }} />
        <h1>{addressInfo.address.slice(0, 6)} . . . {addressInfo.address.slice(-4)}</h1>
        <p>{addressInfo.chainName}</p>
      </div>) : errorMessage ? (<p>{errorMessage}</p>) : (<p>Loading...</p>)}
    </header>)
}

function Home() {
  return (
    <header className="App-header">
      <p>
        No address specified
      </p>
    </header>)
}

function App() {
  return (
    <div className="App">
      <Routes>
        <Route index element={<Home />} />
        <Route path="/:address" element={<Address />} />
      </Routes>
    </div>
  );
}

export default App;
