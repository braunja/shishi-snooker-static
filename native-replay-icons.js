(() => {
      function bindReplayIcons(product) {
        product.drawReplayIcon = (ctx, { id, status }) => {
          ctx.save();
          ctx.strokeStyle = ctx.fillStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.lineCap = ctx.lineJoin = "round";
          if (id === "previous" || id === "next") {
            if (id === "next") ctx.scale(-1, 1);
            ctx.beginPath();
            ctx.moveTo(-16, -13);
            ctx.lineTo(-16, 13);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(12, -13);
            ctx.lineTo(-9, 0);
            ctx.lineTo(12, 13);
            ctx.closePath();
            ctx.stroke();
          } else if (status?.ended) {
            ctx.beginPath();
            ctx.arc(0, 0, 13, -Math.PI * 0.78, Math.PI * 0.95);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-14, -14);
            ctx.lineTo(-14, -3);
            ctx.lineTo(-3, -3);
            ctx.stroke();
          } else if (status?.paused) {
            ctx.beginPath();
            ctx.moveTo(-8, -13);
            ctx.lineTo(13, 0);
            ctx.lineTo(-8, 13);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(-10, -13, 6, 26);
            ctx.fillRect(4, -13, 6, 26);
          }
          ctx.restore();
          return true;
        };
      }
bindReplayIcons(window.SnookerProduct);
})();
