
const form = document.querySelector("form");


form.addEventListener("submit", async (event) => {

    event.preventDefault();


    const monitor = {

        monitorName:
            document.querySelector("#monitorName").value,

        url:
            document.querySelector("#url").value,

        method:
            document.querySelector("#method").value,

        interval:
            Number(
                document.querySelector("#interval").value
            ),

        expectedStatus:
            Number(
                document.querySelector("#expectedStatus").value
            ),

        timeout:
            Number(
                document.querySelector("#timeout").value
            )

    };


    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        const response = await fetch("/api/monitors", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(monitor)
        });

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            PulseFX.toast(data.message || "Could not create monitor.");
            return;
        }

        window.location.href = "monitors.html";
    } catch (err) {
        PulseFX.toast("Network error. Please try again.");
    } finally {
        submitBtn.disabled = false;
    }

});

