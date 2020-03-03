import swal from 'sweetalert';

var fx = function (a) {
    return function (b) {
        return [a, b]
    }
}

export var AskLogout = fx((dispatch, props) => {
    swal({
        title: "Are you sure?",
        // text: "Once deleted, you will not be able to recover this imaginary file!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((willLogout) => {
            if (willLogout) {
                dispatch(props.action)
                swal("You have been logged out!", {
                    icon: "success",
                });
            }
        });
});