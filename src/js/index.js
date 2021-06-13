$(window).on('onContractReady', async function (e) {

    let searchParams = new URLSearchParams(window.location.search);
    let recordId;
    let transferRecordId;

    if (searchParams.has('recordId')) {
        recordId = searchParams.get('recordId');
        
        const baseRecordId = await App.getBaseRecordId(recordId);
        console.log(parseInt(baseRecordId));

        App.getRecord(baseRecordId).then(function (record) {
            render(record);
        });
    }
    else {
        renderMap([]);
    }

    renderMyRecords();
    
    async function renderMyRecords() {
        var container = $("#editor-record-list");

        var records = await App.getOwnerRecords(App.account);
        records.forEach(record => {
            const href = location.protocol + '//' + location.host + location.pathname + "?recordId=" + record.recordId;
            const html = `<a href="` + href + `" class="list-group-item list-group-item-action"> Record ` + record.recordId + ` </a>`;
            container.append(html);
        }); 
    }

    async function render(record) {
        let mapPoints = [];
        var container = $("#editor-record-cards");
        var i = 0;
        while (record) {
            mapPoints.push(record.latlong);

            var cardStyleClass = "";
            if (record.recordId == recordId) {
                cardStyleClass = "border-warning";
            }

            var ownerAddressField = record.ownerAddress;
            if (record.ownerAddress == App.account) {
                ownerAddressField = "You";
            }

            var transferButtonClass = "d-none";
            const nextRecord = await App.getNextRecord(record.recordId);
            if (!nextRecord && record.ownerAddress == App.account) {
                transferButtonClass = "";
                transferRecordId = record.recordId;
            }

            const recordHtml = 
            `<div class="col-lg-4 pb-4" style="z-index: 100;">
                <div class="card ` + cardStyleClass + `">
                    <div style="position: absolute; left: 0; top: 50%;" id="start-` + i + `"></div>
                    <div class="card-body">
                        <h5 class="card-title">Record ` + record.recordId + `</h5>
                        <p class="card-text">
                        <div class="w-50 d-inline-block">Owner</div><div class="w-50 d-inline-block text-truncate">` + ownerAddressField + `</div>
                        <div class="w-50 d-inline-block">LatLong</div><div class="w-50 d-inline-block text-truncate">` + record.latlong + `</div>
                        <div class="w-50 d-inline-block">Date</div><div class="w-50 d-inline-block text-truncate">` + record.date + `</div>
                        <div class="w-50 d-inline-block">Price</div><div class="w-50 d-inline-block text-truncate">` + record.price + `</div>
                        <div class="w-50 d-inline-block">Quantity</div><div class="w-50 d-inline-block text-truncate">` + record.quantity + `</div>
                        <div class="w-50 d-inline-block">Weight</div><div class="w-50 d-inline-block text-truncate">` + record.weight + `</div>
                        <div class="w-50 d-inline-block">Conformity</div><div class="w-50 d-inline-block">` + record.conformity + `</div>
                        </p>
                    </div>
                    <div class="p-2"></div>

                    <div style="position: absolute; right: 1px; bottom: 1px;" class="` + transferButtonClass + `">
                        <button type="button" class="btn btn-light" data-toggle="modal" data-target="#transfer-modal">Transfer -></button>
                    </div>

                    <div style="position: absolute; right: 0; top: 50%;" id="end-` + i + `"></div>

                    <div onclick="showQRCode(` + record.recordId + `)" style="position: absolute; right: 2px; top: 2px;">
                        <img src="./images/qrCode.png" />
                    </div>
                </div>
            </div>`;
            container.append(recordHtml);

            if (i > 0) {
                new LeaderLine(
                    document.getElementById('end-' + (i-1)),
                    document.getElementById('start-' + i)
                  ).path = 'straight';
            }

            record = nextRecord;
            i++;
        }

        renderMap(mapPoints);
    }

    //////// EVENTS: //////// 
    $("#transfer-modal-submit").click(async function() {
        const buyerAddress = $("#transfer-modal-buyer-address").val();
        const latlong = $("#transfer-modal-lat").val() + ";" + $("#transfer-modal-long").val();
        const date = $("#transfer-modal-date").val();
        const price = $("#transfer-modal-price").val() + $("#transfer-modal-currency").val();
        const weight = $("#transfer-modal-weight").val();
        const quantity = $("#transfer-modal-quantity").val();
        
        await App.transferRecord(transferRecordId, buyerAddress, latlong, date, price, weight, quantity);
        window.location.reload();
    });

    $("#add-modal-submit").click(async function() {
        const latlong = $("#add-modal-lat").val() + ";" + $("#add-modal-long").val();
        const date = $("#add-modal-date").val();
        const weight = $("#add-modal-weight").val();
        const quantity = $("#add-modal-quantity").val();
        const conformity = $("#add-modal-conformity").val();
        
        await App.addRecord(latlong, date, weight, quantity, conformity);
        window.location.reload();
    });
    
});


function renderMap(points) {

    // conver latlong points from "lat-long" to [lat, long]
    const l = points.length;
    for (var i = 0; i < l; i++) {
        console.log(points[i].split(";"));
        points[i] = points[i].split(";").map(x => parseFloat(x)).reverse();
    }

    var lineString = new ol.geom.LineString(points);
    lineString.transform('EPSG:4326', 'EPSG:3857');

    var lineLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [new ol.Feature({
                geometry: lineString,
                name: 'Line'
            })]
        }),
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'green',
                opacity: 0.5,
                width: 5
            })
        })
    });

    var markersLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
          image: new ol.style.Icon({
            anchor: [0.5,1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: 'images/mapmarker.png',
            scale: 0.2
          })
        })
      });
    
    
    for (i = 0; i < l; i++) {
    var marker = new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat(points[i])));
    markersLayer.getSource().addFeature(marker);
    }
    

    var view = new ol.View({
        center: ol.proj.transform([103.986908, 1.353199], 'EPSG:4326','EPSG:3857'),
        zoom: 2
    });
    var map = new ol.Map({
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            lineLayer,
            markersLayer
        ],
        target: 'map',
        controls: ol.control.defaults({
            attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
                collapsible: false
            })
        }),
        view: view
    });
}

var qrCode = new QRCode(document.getElementById("qrcode"), "");
function showQRCode(recordId) {
    $("#qr-modal").modal('show');
    const url = location.protocol + '//' + location.host + location.pathname + "?recordId=" + recordId;
    qrCode.clear()
    qrCode.makeCode(url);
}