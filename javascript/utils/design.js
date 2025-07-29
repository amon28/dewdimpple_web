window.addEventListener("scroll", function () {
    const screenWidth = window.innerWidth;
    if(screenWidth <= 800){
        let buttonElements = document.querySelectorAll(".fixed-btn")
        buttonElements.forEach((element)=>{
            let scrollAmount = window.scrollY;
            let maxScroll = 200; // The scroll point where it becomes fully transparent
            let opacity = 1 - (scrollAmount / maxScroll);

            if (opacity < 0.5) opacity = 0.5; // Prevent opacity from going negative
            element.style.opacity = opacity;
        }) 
    }else{
        document.querySelectorAll(".fixed-btn").forEach((element) => {
            element.style.opacity = "1";
        });
    }
});