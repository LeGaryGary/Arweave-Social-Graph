import { app, h } from 'hyperapp';
/** @jsx h */

import { arweave } from '../effects/Arweave';
import { equals, and } from 'arql-ops';

import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
cytoscape.use(cola);

const graphId = 'graph';
let cy;

export default () => {
  return (
    <div class="big-panel round-shadow">
      <div id={graphId} />
      <div class="small-panel round-shadow">
        <input
          placeHolder="Enter name or address..."
          id="nameInput"
          onInput={Find}
        ></input>
        <hr />
        <button id="goButton" class="round-shadow" onClick={Go}>
          Reload Graph
        </button>
        <script>document.getElementById('goButton').click()</script>
      </div>
    </div>
  );
};

function Find(s, e) {
  let id = e.target.value;
  if (id !== '' && cy != null) {
    const search = MakeSearchable(id);
    const cyFilter = `node[labelSearchable = "${search}"],node[addressSearchable = "${search}"]`;
    cy.filter(':selected').unselect();
    cy.filter(cyFilter).select();
    cy.fit(cy.$(':selected'), 200);
  }
  return { ...s, identifier: id };
}

function Go(state, event) {
  let elements = [];

  var query = equals('App-Name', 'social-graph');

  let uniqueAddresses;
  let transactions;

  const graphElement = document.getElementById(graphId);
  graphElement.innerHTML = '';

  arweave
    .arql(query)
    .then(txids => txids.map(txid => arweave.transactions.get(txid)))
    .then(ps => Promise.all(ps))
    .then(txs =>
      txs.map(tx => {
        // Get social graph Data
        var data = tx.get('data', { decode: true, string: true });
        var t = {};
        tx.tags.forEach(tag => {
          var name = tag.get('name', { decode: true, string: true });
          var value = tag.get('value', { decode: true, string: true });
          t[name] = value;
        });
        return arweave.wallets
          .ownerToAddress(tx.owner)
          .then(owner => ({ data, tags: t, from: owner }));
      }),
    )
    .then(txs => Promise.all(txs))
    .then(txs => txs.filter(tx => tx.tags['Action'] === 'follow')) // Get just follows
    .then(txs => {
      transactions = txs;
      // Build nodes and edges
      uniqueAddresses = [
        ...txs.map(tx => tx.data),
        ...txs.map(tx => tx.from),
      ].filter((data, index, self) => self.indexOf(data) === index);

      const agentsPromises = [];
      const idQuery = address =>
        and(
          equals('from', address),
          equals('App-Name', 'arweave-id'),
          equals('Type', 'name'),
        );
      uniqueAddresses.forEach((address, i) => {
        agentsPromises.push(
          arweave
            .arql(idQuery(address))
            .then(txids => {
              if (txids.length === 0) return null;
              return arweave.transactions.get(txids[txids.length - 1]);
            })
            .then(tx => {
              const agent = {
                name: address,
                iconUrl:
                  'https://arweave.net/PylCrHjd8cq1V-qO9vsgKngijvVn7LAVLB6apdz0QK0',
                address,
              };
              if (tx == null) return agent;
              var tags = tx.tags.map(tag => ({
                name: tag.get('name', { decode: true, string: true }),
                value: tag.get('value', { decode: true, string: true }),
              }));
              var typeTag = tags.filter(t => t.name === 'Type');
              const type = typeTag[0].value;
              const data = tx.get('data', { decode: true, string: true });
              agent[type] = data;
              return agent;
            }),
        );
      });
      return agentsPromises;
    })
    .then(aps => Promise.all(aps))
    .then(agents => agents.filter(a => a != null))
    .then(agents =>
      agents.reduce((a, b) => {
        a[b.address] = b;
        return a;
      }, {}),
    )
    .then(agents => {
      uniqueAddresses.forEach(address => {
        elements.push({
          data: {
            id: address,
            addressSearchable: MakeSearchable(address),
            label: GetName(agents, address),
            labelSearchable: MakeSearchable(GetName(agents, address)),
            image: agents[address] ? agents[address].iconUrl : null,
            size: 100,
          },
        });
      });

      transactions.forEach(tx => {
        elements.push({
          data: {
            id: tx.from + ' -> ' + tx.data,
            source: tx.from,
            target: tx.data,
          },
        });
      });

      cy = cytoscape({
        container: graphElement,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-image': 'data(image)',
              'background-fit': 'cover',
              label: 'data(label)',
            },
          },

          {
            selector: 'edge',
            style: {
              width: 3,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
            },
          },
        ],

        layout: {
          name: 'cola',
          animate: true, // whether to show the layout as it's running
          refresh: 1, // number of ticks per frame; higher is faster but more jerky
          maxSimulationTime: 10000, // max length in ms to run the layout
          ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
          fit: false, // on every layout reposition of nodes, fit the viewport
          padding: 30, // padding around the simulation
          boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
          nodeDimensionsIncludeLabels: false, // whether labels should be included in determining the space used by a node

          // layout event callbacks
          ready: function() {}, // on layoutready
          stop: function() {}, // on layoutstop

          // positioning options
          randomize: true, // use random node positions at beginning of layout
          avoidOverlap: false, // if true, prevents overlap of node bounding boxes
          handleDisconnected: true, // if true, avoids disconnected components from overlapping
          convergenceThreshold: 0.01, // when the alpha value (system energy) falls below this value, the layout stops
          nodeSpacing: function(node) {
            return 10;
          }, // extra spacing around nodes
          flow: undefined, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
          alignment: undefined, // relative alignment constraints on nodes, e.g. function( node ){ return { x: 0, y: 1 } }
          gapInequalities: undefined, // list of inequality constraints for the gap between the nodes, e.g. [{"axis":"y", "left":node1, "right":node2, "gap":25}]

          // different methods of specifying edge length
          // each can be a constant numerical value or a function like `function( edge ){ return 2; }`
          edgeLength: 180, // sets edge length directly in simulation
          edgeSymDiffLength: undefined, // symmetric diff edge length in simulation
          edgeJaccardLength: undefined, // jaccard edge length in simulation

          // iterations of cola algorithm; uses default values on undefined
          unconstrIter: undefined, // unconstrained initial layout iterations
          userConstIter: undefined, // initial layout iterations with user-specified constraints
          allConstIter: undefined, // initial layout iterations with all constraints including non-overlap

          // infinite layout options
          infinite: true, // overrides all other options for a forces-all-the-time mode
        },
      });
      cy.on('click', 'node', function(evt) {
        document.getElementById('nameInput').value = this.id();
      });
    });
  return { ...state };
}

function GetName(agents, address) {
  return agents[address] ? agents[address].name : address;
}

function MakeSearchable(input) {
  let output = input.replace(/ /g, '');
  output = output.toLowerCase();
  return output;
}
