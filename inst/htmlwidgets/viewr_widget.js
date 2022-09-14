HTMLWidgets.widget({

  name: 'viewr_widget',

  type: 'output',

  factory: function(el, width, height) {

    const container = d3.select(el).html('');
    const shutter_height = 40;
    const shutter_text = 'Take Photo!';

    const shutterHolder = container.append('center');

    const shutter = shutterHolder.append('button')
      .text(shutter_text)
      .style('width', '50%')
      .style('max-width', '300px')
      .style('height', `${shutter_height}px`)
      .style('font-size', '24px')
      .style('font-family', 'Optima');

    const sendingAnimation = container
      .append('div')
      .text('Sending Photo to Shiny')
      .style('display', 'none');

    const video = container
      .append('center')
        .style('height', "calc(100% - 40px)")
        .style('width', '100%')
      .append('video')
      .attr('autoplay', true)
      .attr('playsinline', true)
      .style('height', '100%')
      .node();

    const canvas = container
      .append('canvas')
      .style('display', 'none')
      .attr('width', `${video.width}px`)
      .attr('height', `${video.height}px`)
      .style('width', `${video.width}px`)
      .style('height', `${video.height}px`);

    const ctx = canvas.node().getContext('2d');

    // Handle message from shiny saying photo was received.
    Shiny.addCustomMessageHandler("photoReceived", (message) => {
      // Replace shutter text with default.
      shutter.text(shutter_text);
    });

    let videoStream;

    return {

      renderValue: function(x) {

        const outputWidth = x.outputWidth === null ? width: x.outputWidth;
        const outputHeight = x.outputHeight === null ? height: x.outputHeight;
        function startStream(stream) {
          video.srcObject = stream;
          video.play();
          shutter.on('click', () => {
            // draw current video frame to the invisible canvas element
            ctx.drawImage(video, 0, 0, outputWidth, outputHeight);

            // send the current canvas state to shiny as a base64 encoded string
            shutter.text('Sending photo to server...');

            Shiny.onInputChange(
              el.id + "_photo",
              canvas.node().toDataURL("image/png")
            );
           }); // end on('click')
        }
        // kills all currently running video streams
        function stopMediaTracks(stream) {
          stream.getTracks().forEach(track => {
            track.stop();
          });
        }

        function getCameraImage(facingMode = 'user'){
          if (typeof videoStream !== 'undefined') {
            stopMediaTracks(videoStream);
          }

          navigator.mediaDevices
            .getUserMedia({
              video: {
                facingMode,
                width: outputWidth,
                height: outputHeight
              }
            })
            .then(startStream)
            .catch(error => {
              container.append('div')
              .html(`<h3>Uh oh! Something went wrong.</h3> <p>Either you are not on a seccure site (either localhost or and https url), you don't have any cameras attached to your computer, or you didn't enable camera permissions (I understand).</p>`);
              console.log('my error', error);
            });
        }

        canvas
          .attr('width', outputWidth)
          .attr('height', outputHeight);

        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

          navigator.mediaDevices
            .enumerateDevices()
            .then( devices => {

              const numberVideoDevices = devices
                .filter(d => d.kind === 'videoinput')
                .length;

              if(numberVideoDevices > 1){
                const cameraChooser = shutterHolder
                  .append('select')
                  .style('height', `${shutter_height}px`)
                  .style('font-size', '24px')
                  .style('font-family', 'Optima');

                cameraChooser.selectAll('option').data(
                    [
                      {value: 'user', title: 'front'},
                      {value:'environment', title: 'rear'}
                    ]
                  )
                  .enter().append('option')
                  .attr('value', d => d.value)
                  .text(d => d.title);

                cameraChooser.on('change', function(){
                    const selectValue = d3.select(this).property('value');
                    getCameraImage(selectValue);
                  });
                }
            });

            getCameraImage();
          } // end if
      },
       resize: function(width, height) {
        // TODO: code to re-render the widget with a new size
      }

    };
  }
});
