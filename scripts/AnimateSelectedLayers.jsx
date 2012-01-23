//
// createTextLayersFromFile.jsx
//

//
// This script reads a user specified text file and
// creates a text layer for each line of text in a 
//  new comp called "my text comp"
//

{

    var selectedLayers = new Array();

    var activeItem = app.project.activeItem;
    if (activeItem == null || !(activeItem instanceof CompItem))
    {
        alert("Please select the template composition to use in the Project panel.");
    }
    else
    {
        clearOutput();
        write( "Initialising..." );
        init();
    }
}

function init()
{
    // create undo group

    app.beginUndoGroup("Fade In/Out Selected Layers");

    // Prompt user to select text file

    var myFile = File.openDialog("Please select a settings file.");
    if (myFile != null)
    {

        // open file
        var fileOK = myFile.open("r");
        if ( fileOK )
        {

            // create project if necessary

            var proj = app.project;
            if(!proj) proj = app.newProject();


            var everyItem = app.project.items;
            //      first we build the comp collection so that renaming doesn't mess up because comps
            //      jump to new positions with new names!!
            for (var i = activeItem.layers.length; i >= 1; i--)
            {
                if ( activeItem.layers[ i ].selected) 
                {
                    selectedLayers.push( activeItem.layers[ i ] );
                }
            }



            var text = "";
            var _key_frame_settings = [];
            
            while (!myFile.eof)
            {
                text = myFile.readln();
                if (text == "") { text = "\r" ;}
                
                if ( text[ 0 ] != "/" && text.length > 5)
                {
                    _key_frame_settings = parseCustomCSV( text );
                    setKeyFramesFor( _key_frame_settings );
                }
            }
        }
    }
}

function setKeyFramesFor( $settings )
{
    var fadeInOutTimes = [];
    
    for ( var j = 0; j < selectedLayers.length; j++ )
    {
        
        var easeNone = new KeyframeEase(0.5, 0.1);
        var easeIn = new KeyframeEase(0.1, 50);
        var easeOut = new KeyframeEase(1, 50);
        
//        writeLn("Attempting to set " + $settings[ 0 ]+":" );
        if ( $settings[ 0 ] && selectedLayers[ j ].property( String( $settings[ 0 ] ) ) )
        {
            var prop = selectedLayers[ j ].property( $settings[ 0 ] );
            var origPropVal = prop.valueAtTime( 0, true );
            
            while ( prop.numKeys >= 1 )
            {
                prop.removeKey( prop.numKeys );
            }
            /* Set the default value on the first frame and use as a base reference
                 * for if/when we update the values. */
            prop.setValueAtTime( 0, origPropVal );
            
            for ( var si = 0; si < $settings[ 1 ].length; si++ )
            {
                var ei = easeIn;
                var eo = easeOut;
                
                var easeArray = $settings[ 4 + si ];
                if ( easeArray && easeArray[ 0 ] && easeArray[ 1 ] )
                {
                    var eiStr = String( easeArray[ 0 ] ).toLowerCase();
                    var eoStr = String( easeArray[ 1 ] ).toLowerCase();
                    
                    if ( eiStr == "easein" )
                    {
                        ei = easeIn;
                        write("~ei:easeIn");
                    }
                    else if ( eiStr == "" || eiStr == "easenone" )
                    {
                        ei = easeNone;
                        write("~ei:easeNone");
                    }
                    else if ( eiStr == "easeout" )
                    {
                        ei = easeOut;
                        write("~ei:easeOut");
                    }
                
                    if ( eoStr == "easein" )
                    {
                        eo = easeIn;
                        write("~eo:easeIn");
                    }
                    else if ( eoStr == "" || eoStr == "easenone" )
                    {
                        eo = easeNone;
                        write("~eo:easeNone");
                    }
                    else if ( eoStr == "easeout" )
                    {
                        eo = easeOut;
                        write("~eo:easeOut");
                    }
                }
            
                var randomAmount = String( $settings[ 3 ][ si ] ).split( "|" );
                
                var sv = String( $settings[ 2 ][ si ] ).split("|");
                
                for ( var svi = 0; svi < sv.length; svi++ )
                {
                    if ( sv[ svi ][ 0 ] == '"' || sv[ svi ][ 0 ] =="'" )
                    {
                        sv[ svi ] = sv[ svi ].split('"').join("").split("'").join("")
                        if ( randomAmount[ si ] )
                        {
                            sv[ svi ] = origPropVal[ svi ] +( Math.random() * randomAmount[ svi ] ) + parseFloat( sv[ svi ] );
                        }
                        else
                        {
                            sv[ svi ] = origPropVal[ svi ] + parseFloat( sv[ svi ] );
                        }
                    }
                    if ( isNaN( parseFloat( sv[ svi ] ) ) )
                    {
                        writeLn( "Warning: Could not convert " + String( sv[ svi ] ) + " to a number." );
                        sv[ svi ] = origPropVal[ svi ];
                    }
                    else
                    {
                        sv[ svi ] = parseFloat( sv[ svi ] );
                    }
                }
                
                var st = $settings[ 1 ][ si ];
                st = String( st ).split( "in" ).join( selectedLayers[ j ].inPoint );
                st = String( st ).split( "out" ).join( selectedLayers[ j ].outPoint );
                st = eval( st );
                
                if ( isNaN( parseFloat( st ) ) )
                {
                    writeLn( "Warning: Could not convert " + String( st ) + " to a number." );
                }
                else
                {
                    st = parseFloat( st );
                    
//                    write( ">" + st + ":" + String( sv ) + ":" + sv.length);
                    prop.setValueAtTime( st, sv );

                    if ( !( ei == easeNone && eo == easeNone ) )
                    {
                        var eiAr = [];
                        var eoAr = [];
                        
                        for ( var dc = 0; dc < sv.length; dc++ )
                        {
                            eiAr.push( ei );
                            eoAr.push( eo );
                        }
                        writeLn( eiAr.length + " @ " + eoAr.length );
                        prop.setTemporalEaseAtKey( si + 1, eiAr, eoAr );
                    }
                }
            }
        
            prop.setInterpolationTypeAtKey( 1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR );
        }
        else
        {
           writeLn( "No property: '" + String( $settings[ 0 ] ) + "' found on selected layer. " )
           write( selectedLayers[ j ].property( String("Opacity") ) );
           write( selectedLayers[ j ].property( String( $settings[ 0 ] ) ) );
        }
    
/*        fadeInOutTimes = [ selectedLayers[ i ].inPoint, selectedLayers[ i ].inPoint + 1, 
                                        selectedLayers[ i ].outPoint - 1, selectedLayers[ i ].outPoint ];
        if ( selectedLayers[ i ].opacity )
        {
            var prop = selectedLayers[ i ].opacity;
            prop.setValuesAtTimes( fadeInOutTimes, [ 0, 100, 100, 0 ] );
            prop.setTemporalEaseAtKey(1, [easeIn], [easeOut]);
            prop.setTemporalEaseAtKey(2, [easeOut], [easeIn]);
            
            prop.setTemporalEaseAtKey(3, [easeOut], [easeIn]);
            prop.setTemporalEaseAtKey(4, [easeIn], [easeOut]);
        }
        else
        {
            writeLn("No opacity found on selected layer!" );
        }*/
   }
}

function fetchCompByName( $name )
{
    var myItemCollection = app.project.items;
    
    for ( var i = 1; i <= myItemCollection.length; i++ )
    {
        if ( myItemCollection[ i ].name == $name )
        {
            return myItemCollection[ i ];
        }
    }

    return null;
}

function parseCustomCSV( $csvStr )
{
    var results = $csvStr.split(",");
    var newResults = [];
    for ( var uic = 0; uic < results.length; uic++ )
    {
        var currentStartChar = results[ uic ].split(" ").join("")[ 0 ];
        var currentEndChar = results[ uic ].split(" ").join("")[ results[ uic ].split(" ").join("").length - 1 ];
        write("S:" + currentStartChar +":E:" + currentEndChar +"(" + results[ uic ] + ") # ");
 /*       if ( currentEndChar == '"' && currentStartChar != '"' )
        {
            var j1 = uic - 1;
            while ( j1 >= 0 && results[ j1 ][ 0 ] != '"' )
            {
                results[ j1 ] = results[ j1 ] + results[ j1 + 1 ];
                results.splice( j1 + 1, 1 );
                j1 --;
            }
            results[ j1 ] = String( results[ j1 ] + results[ j1 + 1 ] );
            results.splice( j1 + 1, 1 );
        }*/
        if ( currentEndChar == ']' && currentStartChar != '[' )
        {
            var j2 = uic - 1;
            while ( j2 >= 0 && results[ j2 ].split(" ").join("")[ 0 ] != '[' )
            {
                results[ j2 ] = results[ j2 ] + "," + results[ j2 + 1 ];
                results.splice( j2 + 1, 1 );
                j2 --;
                uic--;
            }
            results[ j2 ] = String( results[ j2 ] + "," + results[ j2 + 1 ] );
            results.splice( j2 + 1, 1 );
            write("|Result " + uic+":"+j2 +":" + results[ j2 ] +"|" );
        }
//        if ( results[ uic ] && results[ uic ][ 0 ] == '"' ) results[ uic ] = results[ uic ].slice( 1, results[ uic ].length - 1 );
//        if ( results[ uic ] && results[ uic ][ results[ uic ].length - 1 ] == '"' ) results[ uic ] = results[ uic ].slice( 0, results[ uic ].length - 2 );
    }

    /* All items after first property should be arrays */
    for ( var uic2 = 1; uic2 < results.length; uic2++ )
    {
        var result = String( results[ uic2 ] );
        result = result.split(" ").join("").split("[").join("").split("]").join("");
        var tmpAr = result.split(",");
        for ( var tmpArI = 0; tmpArI < tmpAr.length; tmpArI ++ )
        {
            if ( tmpAr[ tmpArI ][ 0 ] != '"' && tmpAr[ tmpArI ].indexOf( "|" ) == -1 && !isNaN( parseFloat( tmpAr[ tmpArI ] ) ) )
            {
                tmpAr[ tmpArI ] = parseFloat( tmpAr[ tmpArI ] );
            }
        }
        results[ uic2 ] = tmpAr;
    }

    if ( results[ 0 ] && results[ 0 ][ 0 ] == '"' ) results[ 0 ] = results[ 0 ].slice( 1, results[ 0 ].length - 1 );
    if ( results[ 0 ] && results[ 0 ][ results[ 0 ].length - 1 ] == '"' ) results[ 0 ] = results[ 0 ].slice( 0, results[ 0 ].length - 2 );
//    results[ 0 ] == String( results[ 0 ].split("'").join("").split('"').join("") );
//    writeLn( "Returning: " + results.length );
    write( "    :" + String( results[ 0 ] ) +"::" + String( results[ 1 ] ) + "::" + String( results ) + ";");    
    return results;
}

