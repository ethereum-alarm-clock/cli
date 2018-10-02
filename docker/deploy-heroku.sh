#!/bin/bash
WORKERS=(
  'eac-cli-kovan-100-0x4d5e69 wallet--4d5e6943ea42c6413727f5f59a113d115d29d63a'
  'eac-cli-ropsten-0x4d5e69-inf wallet--4d5e6943ea42c6413727f5f59a113d115d29d63a'
  'eac-cli-kovan-100-0x7e2358-inf wallet--7e2358dee08671cf829817cb7e26f625a963c055'
  'eac-cli-kovan-100-0x8137f6 wallet--8137f6f9648647365af8ae13b65b339ddd673b8d'
  'eac-cli-ropsten-0x8137f6 wallet--8137f6f9648647365af8ae13b65b339ddd673b8d'
  'eac-cli-kovan-100-0xf509e3 wallet--f509e35e068459ae45ac3fe92cda8d9c94585783'
  )

for i in "${WORKERS[@]}"
do
   worker="$(cut -d' ' -f1 <<< $i)"
   wallet="$(cut -d' ' -f2 <<< $i)"

   echo Deploying $worker with $wallet

   docker build --build-arg WALLET=$wallet -t eac-cli .
   heroku container:push worker -a $worker --arg WALLET=$wallet -v
   heroku container:release worker -a $worker
done
