<!-- Admin Tool: Fake server-side endpoint failures to ensure client handles fails gracefully and cushions user on the front end -->
<?php require_once APPPATH . 'libraries/ViewUtils.php'; ?>

<div class="container">
    <?php $this->load->view('player_nav') ?>
    <div class="row">
        <div class="card col s12">

            <h4>Endpoint Fail Generator</h4>

            <div class="col s12 divider"></div>

            <div class="row">
                <div class="col s12">
                    <button class="btn orange right" id="btn_refresh_endpts"><i class="material-icons right">autorenew</i>Refresh Endpoints</button>
                </div>

                <div class="col s12" id="div_content">
                    <form id="efg-form">
                        <div class="row">
                            <div class="input-field col s3">
                                <select id="efg-medium-selector" style="background-color:#ededed;">
                                    <option value="">Select a medium</option>
                                    <option value="canvas"> Canvas</option>
                                    <option value="mobile"> Mobile</option>
                                </select>
                            </div>
                        </div>
                        <div class="row valign-wrapper">
                            <div class="input-field col s8">
                                <h6>Endpoint Failure:</h6>
                                <select name="efg-endpoint-selector" id="efg-endpoint-selector"></select>
                            </div>
                            <div class="col s4">
                                <a class="btn green" id="btn_set_endpt"><i class="material-icons right">save</i>Set Endpoint</a>
                            </div>
                        </div>
                        <div class="row divider"></div>
                        <div class="row valign-wrapper">
                            <div class="input-field col s8">
                                <label>Fail Endpoint:</label>
                                <input type="text" id="fail_endpoint" style="background-color:#fcf6d9;" value="<?php echo $fail_endpoint; ?>" />
                            </div>
                            <div class="col s4">
                                <a class="btn blue" id="btn_clear_endpt"><i class="material-icons right">clear_all</i>Clear Endpoint</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    $(document).ready(function()
    {
        $('#efg-endpoint-selector').chosen();

        $('#btn_refresh_endpts').click(function()
        {
            refreshEndpoints();
        });

        $('#btn_set_endpt').click(function()
        {
            setEndpoint();
        });

        $('#btn_clear_endpt').click(function()
        {
            clearEndpoint();
        });

        $('#efg-medium-selector').on('change', getEndpoints);
    });

    function refreshEndpoints()
    {
        refresh_endpoints = 'endpoint_fail_generator/load_endpoints';
        $.post(refresh_endpoints, function(data,status) {
            if (status == 'success')
            {
                window.location.reload();
            }
        });
    }

    function setEndpoint()
    {
        var endpoint = $('#efg-endpoint-selector');
        var eString = $('option:selected', endpoint).text();

        if (eString && eString !== 'Select an endpoint')
        {
            $('#fail_endpoint').val(eString);
        }
        Materialize.updateTextFields();
        var set_endpoint = 'endpoint_fail_generator/set_endpoint?id=' + playerID;
        $.post(set_endpoint, {"endpoint": document.forms["efg-form"].fail_endpoint.value},
            function(data,status) {
                if (status == 'success')
                {
                    $('#efg-medium-selector').val("");
                    $('#efg-endpoint-selector').val("");
                    window.location.reload();
                };
        });
    }

    function clearEndpoint()
    {
        var eString = "";

        $('#fail_endpoint').val(eString);
        $('#efg-form').attr('action', eString);

        $(document).ready(function () {
            setEndpoint();
        });
    }

    function getEndpoints()
    {
        var options = '<option>Select an endpoint</option>';
        var medium = $('#efg-medium-selector').val();
        var endpointList = <?php echo(json_encode($endpointList)); ?>;
        var mediumEndpoints = endpointList[medium];

        if (mediumEndpoints)
        {
             $.each(mediumEndpoints, function (key, val)
            {
                options += '<option value="' + key + '">' + val + '</option>';
            });

            $('#efg-endpoint-selector').html(options);
            $('#efg-endpoint-selector').trigger('chosen:updated');
        }
    }
</script>
